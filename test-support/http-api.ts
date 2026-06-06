export type TestAuthRole = 'merchant' | 'partner' | 'admin';

export interface TestJwtClaims {
    sub: string;
    app_role: TestAuthRole;
    merchant_id?: string;
    partner_id?: string;
    email?: string;
}

export const TEST_JWT_CLAIMS: Record<TestAuthRole, TestJwtClaims> = {
    merchant: {
        sub: 'supabase-user-merchant-1',
        app_role: 'merchant',
        merchant_id: 'merchant_1',
        email: 'merchant_1@example.com',
    },
    partner: {
        sub: 'supabase-user-partner-2',
        app_role: 'partner',
        partner_id: 'partner_2',
        email: 'partner_2@example.com',
    },
    admin: {
        sub: 'supabase-user-admin-1',
        app_role: 'admin',
        email: 'admin_1@example.com',
    },
};

export const createUnsignedJwt = (claims: TestJwtClaims): string => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');

    return `${header}.${payload}.`;
};

interface CreateHttpApiEventOptions {
    token?: string;
    claims?: TestJwtClaims;
    body?: string | null;
    headers?: Record<string, string>;
    pathParameters?: Record<string, string> | null;
    queryStringParameters?: Record<string, string> | null;
    requestId?: string;
}

export type TestHttpApiEvent = any;

export const createHttpApiEvent = ({
    token,
    claims,
    body = null,
    headers,
    pathParameters = null,
    queryStringParameters = null,
    requestId = 'req_123',
}: CreateHttpApiEventOptions = {}): TestHttpApiEvent => {
    const resolvedToken = token ?? (claims ? createUnsignedJwt(claims) : undefined);

    return {
        version: '2.0',
        routeKey: '$default',
        rawPath: '/',
        rawQueryString: '',
        headers: {
            ...(resolvedToken ? { authorization: `Bearer ${resolvedToken}` } : {}),
            ...(headers ?? {}),
        },
        requestContext: {
            accountId: '123456789012',
            apiId: 'api-id',
            domainName: 'example.execute-api.eu-central-1.amazonaws.com',
            domainPrefix: 'example',
            http: {
                method: 'GET',
                path: '/',
                protocol: 'HTTP/1.1',
                sourceIp: '127.0.0.1',
                userAgent: 'jest',
            },
            requestId,
            routeKey: '$default',
            stage: '$default',
            time: '01/Jan/2026:00:00:00 +0000',
            timeEpoch: 0,
            authorizer: claims
                ? {
                      jwt: {
                          claims,
                          scopes: [],
                      },
                  }
                : undefined,
        },
        isBase64Encoded: false,
        body: body ?? undefined,
        pathParameters: pathParameters ?? undefined,
        queryStringParameters: queryStringParameters ?? undefined,
        stageVariables: undefined,
        cookies: [],
    } as TestHttpApiEvent;
};
