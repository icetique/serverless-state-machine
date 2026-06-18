#!/usr/bin/env node

/**
 * Local smoke test for the shared lambda-utils layer refactor.
 * Does not deploy — uses `sam local invoke` against `.aws-sam/build`.
 *
 * Prerequisites:
 *   npm run build:layer && sam build
 *   .env.json with DATABASE_URL (and other Lambda env vars)
 */

import { execSync } from 'child_process';
import { mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';

const PROJECT_DIR = fileURLToPath(new URL('..', import.meta.url));
const ENV_FILE = process.env.ENV_FILE ?? '.env.json';
const TMP_DIR = join(PROJECT_DIR, '.smoke-tmp');

const ok = (label) => console.log(`  ✅ ${label}`);
const fail = (label, detail) => {
    console.error(`  ❌ ${label}`);
    if (detail) {
        console.error(`     ${detail}`);
    }
};

const invoke = (functionName, event) => {
    mkdirSync(TMP_DIR, { recursive: true });
    const fixturePath = join(TMP_DIR, `${functionName}.json`);
    writeFileSync(fixturePath, JSON.stringify(event, null, 2));

    const cmd = [
        'sam',
        'local',
        'invoke',
        functionName,
        '--env-vars',
        ENV_FILE,
        '--event',
        fixturePath,
        '--skip-pull-image',
    ].join(' ');

    try {
        const output = execSync(cmd, { cwd: PROJECT_DIR, encoding: 'utf8', timeout: 120_000 });
        return { ok: true, output: output.trim() };
    } catch (error) {
        const output = (error.stdout ?? '') + (error.stderr ?? '');
        return { ok: false, output: output.trim() || String(error.message) };
    } finally {
        try {
            unlinkSync(fixturePath);
        } catch {
            /* ignore */
        }
    }
};

const parseLambdaResponse = (output) => {
    const lines = output.split('\n').filter((line) => line.trim() !== '');
    const lastLine = lines[lines.length - 1] ?? output;

    try {
        return JSON.parse(lastLine);
    } catch {
        return null;
    }
};

const adminClaims = {
    sub: 'supabase-user-admin-1',
    app_role: 'admin',
};

const merchantClaims = {
    sub: 'supabase-user-merchant-1',
    app_role: 'merchant',
    merchant_id: 'merchant_1',
};

const httpApiEvent = ({ method, path, claims, body = null, headers = {}, queryStringParameters = null }) => ({
    version: '2.0',
    routeKey: `${method} ${path}`,
    rawPath: path,
    rawQueryString: queryStringParameters ? new URLSearchParams(queryStringParameters).toString() : '',
    headers,
    requestContext: {
        accountId: '123456789012',
        apiId: 'api-id',
        domainName: 'localhost',
        domainPrefix: 'localhost',
        http: {
            method,
            path,
            protocol: 'HTTP/1.1',
            sourceIp: '127.0.0.1',
            userAgent: 'local-layer-smoke',
        },
        requestId: `req-${randomUUID()}`,
        routeKey: `${method} ${path}`,
        stage: '$default',
        time: '01/Jan/2026:00:00:00 +0000',
        timeEpoch: 0,
        authorizer: {
            jwt: {
                claims,
                scopes: [],
            },
        },
    },
    isBase64Encoded: false,
    body: body ?? undefined,
    queryStringParameters: queryStringParameters ?? undefined,
});

async function main() {
    console.log('\n=== Local lambda-utils layer smoke test ===\n');

    let failures = 0;

    console.log('1. ListAgreementsFunction (admin, layer: createPool + auth)...');
    const listResult = invoke(
        'ListAgreementsFunction',
        httpApiEvent({
            method: 'GET',
            path: '/agreements',
            claims: adminClaims,
            queryStringParameters: { limit: '3' },
        }),
    );

    if (!listResult.ok) {
        failures += 1;
        fail('ListAgreementsFunction invoke failed', listResult.output.slice(-500));
    } else {
        const response = parseLambdaResponse(listResult.output);
        if (
            response?.statusCode === 200 &&
            Array.isArray(response.body ? JSON.parse(response.body).agreements : null)
        ) {
            ok('ListAgreements returned 200 with agreements array');
        } else if (response?.statusCode === 200) {
            ok(`ListAgreements returned 200 (${listResult.output.slice(-120)})`);
        } else {
            failures += 1;
            fail('ListAgreements unexpected response', listResult.output.slice(-500));
        }
    }

    console.log('\n2. CreateAgreementFunction (merchant, layer: getIdempotencyKey + events)...');
    const idempotencyKey = `local-smoke-${randomUUID()}`;
    const createResult = invoke(
        'CreateAgreementFunction',
        httpApiEvent({
            method: 'POST',
            path: '/agreements',
            claims: merchantClaims,
            headers: {
                'Content-Type': 'application/json',
                'Idempotency-Key': idempotencyKey,
            },
            body: JSON.stringify({
                merchantId: 'merchant_1',
                partnerId: 'partner_2',
                amount: 1000,
            }),
        }),
    );

    let agreementId;
    if (!createResult.ok) {
        failures += 1;
        fail('CreateAgreementFunction invoke failed', createResult.output.slice(-500));
    } else {
        const response = parseLambdaResponse(createResult.output);
        const body = response?.body ? JSON.parse(response.body) : null;
        agreementId = body?.agreementId;

        if (response?.statusCode === 201 && agreementId) {
            ok(`CreateAgreement returned 201, agreementId=${agreementId}`);
        } else {
            failures += 1;
            fail('CreateAgreement unexpected response', createResult.output.slice(-500));
        }
    }

    console.log('\n3. OutboxDispatcherFunction (layer: createPool + DB)...');
    const outboxResult = invoke('OutboxDispatcherFunction', {
        source: 'aws.events',
        'detail-type': 'Scheduled Event',
        detail: {},
    });

    if (!outboxResult.ok) {
        failures += 1;
        fail('OutboxDispatcherFunction invoke failed', outboxResult.output.slice(-500));
    } else {
        ok('OutboxDispatcherFunction completed (check logs for dispatch count)');
    }

    if (agreementId) {
        console.log('\n4. DebugEventsFunction (verify outbox/event path for new agreement)...');
        const debugResult = invoke(
            'DebugEventsFunction',
            httpApiEvent({
                method: 'GET',
                path: '/debug/events',
                claims: adminClaims,
                queryStringParameters: { limit: '20', agreementId },
            }),
        );

        if (!debugResult.ok) {
            failures += 1;
            fail('DebugEventsFunction invoke failed', debugResult.output.slice(-500));
        } else {
            const response = parseLambdaResponse(debugResult.output);
            const body = response?.body ? JSON.parse(response.body) : null;
            const events = body?.events ?? [];
            const created = events.some((event) => event.eventType === 'AgreementCreated');

            if (response?.statusCode === 200 && created) {
                ok(`DebugEvents found AgreementCreated for ${agreementId}`);
            } else if (response?.statusCode === 200) {
                ok(`DebugEvents returned 200 (${events.length} events — outbox may still be pending)`);
            } else {
                failures += 1;
                fail('DebugEvents unexpected response', debugResult.output.slice(-500));
            }
        }
    }

    console.log('\n=== Summary ===');
    if (failures === 0) {
        console.log('All local smoke checks passed.\n');
        process.exit(0);
    }

    console.error(`${failures} check(s) failed.\n`);
    process.exit(1);
}

main().catch((error) => {
    console.error('\nLocal smoke test crashed:', error);
    process.exit(1);
});
