import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { SessionIdentity } from '../../../shared/auth-contract';
import { canViewAgreementAction } from '../workflow';
import type { AgreementResult, AgreementSummary, FormState, TransitionAction } from '../types';

const initialForm: FormState = {
    merchantId: '',
    partnerId: 'partner_2',
    amount: '1000',
};

type UseAgreementCommandsArgs = {
    apiBaseUrl: string;
    buildHeaders: (headers?: Record<string, string>) => Record<string, string>;
    identity: SessionIdentity | null;
    isManualSettlementTriggerEnabled: boolean;
    loadAgreements: () => Promise<AgreementSummary[]>;
    loadEvents: () => Promise<unknown[]>;
    loadLedger: () => Promise<unknown[]>;
    updateAgreementStatus: (agreementId: string, status: AgreementSummary['status']) => void;
};

type UseAgreementCommandsResult = {
    actionError: string | null;
    activeAction: string | null;
    error: string | null;
    form: FormState;
    idempotencyKey: string;
    isSubmitting: boolean;
    onAmountChange: (value: string) => void;
    onPartnerIdChange: (value: string) => void;
    resetForSignOut: () => void;
    result: AgreementResult | null;
    runCreateAgreement: (event: FormEvent<HTMLFormElement>) => Promise<void>;
    runTransition: (agreement: AgreementSummary, action: TransitionAction) => Promise<void>;
};

export const useAgreementCommands = ({
    apiBaseUrl,
    buildHeaders,
    identity,
    isManualSettlementTriggerEnabled,
    loadAgreements,
    loadEvents,
    loadLedger,
    updateAgreementStatus,
}: UseAgreementCommandsArgs): UseAgreementCommandsResult => {
    const [form, setForm] = useState<FormState>(initialForm);
    const [result, setResult] = useState<AgreementResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
    const [actionKeys, setActionKeys] = useState<Record<string, string>>({});
    const [actionError, setActionError] = useState<string | null>(null);
    const [activeAction, setActiveAction] = useState<string | null>(null);

    const isMerchant = identity?.role === 'merchant';

    useEffect(() => {
        if (!isMerchant) {
            return;
        }

        setForm((current) => ({
            ...current,
            merchantId: identity?.merchantId ?? '',
        }));
    }, [identity?.merchantId, isMerchant]);

    const resetForSignOut = () => {
        setResult(null);
        setError(null);
        setActionError(null);
        setActionKeys({});
        setIdempotencyKey(crypto.randomUUID());
        setForm((current) => ({
            ...initialForm,
            merchantId: current.merchantId,
        }));
    };

    const runCreateAgreement = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();

        if (!identity || identity.role !== 'merchant') {
            setError('Only merchants may create agreements');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const createPayload = {
                merchantId: identity.merchantId ?? '',
                partnerId: form.partnerId,
                amount: Number(form.amount),
            };
            const response = await fetch(`${apiBaseUrl}/agreements`, {
                method: 'POST',
                headers: buildHeaders({
                    'Content-Type': 'application/json',
                    'Idempotency-Key': idempotencyKey,
                }),
                body: JSON.stringify(createPayload),
            });

            const body = (await response.json()) as AgreementResult | { message: string };

            if (!response.ok) {
                throw new Error('message' in body ? body.message : 'Request failed');
            }

            setResult(body as AgreementResult);
            setIdempotencyKey(crypto.randomUUID());
            setIsSubmitting(false);
            void loadAgreements();
        } catch (caughtError) {
            setError(caughtError instanceof Error ? caughtError.message : 'Unknown submission failure');
            setIsSubmitting(false);
        }
    };

    const runTransition = async (agreement: AgreementSummary, action: TransitionAction): Promise<void> => {
        if (!identity) {
            setActionError('Authentication is required');
            return;
        }

        if (action === 'settle' && !isManualSettlementTriggerEnabled) {
            setActionError('Manual settlement trigger is disabled');
            return;
        }

        if (!canViewAgreementAction(identity, agreement, action, isManualSettlementTriggerEnabled)) {
            setActionError(`You may not ${action} this agreement`);
            return;
        }

        const mapKey = `${agreement.agreementId}:${action}`;
        const key = actionKeys[mapKey] ?? crypto.randomUUID();
        setActionError(null);
        setActiveAction(mapKey);

        try {
            const response = await fetch(`${apiBaseUrl}/agreements/${agreement.agreementId}/${action}`, {
                method: 'POST',
                headers: buildHeaders({
                    'Idempotency-Key': key,
                }),
            });

            const body = (await response.json()) as AgreementResult | { message: string };

            if (!response.ok) {
                throw new Error('message' in body ? body.message : 'Request failed');
            }

            setActionKeys((current) => ({ ...current, [mapKey]: key }));
            const resultBody = body as AgreementResult;
            setResult(resultBody);
            if (resultBody.agreementId && resultBody.newStatus) {
                updateAgreementStatus(resultBody.agreementId, resultBody.newStatus as AgreementSummary['status']);
            }
            const updatedAgreements = await loadAgreements();
            const updated = updatedAgreements.find((a) => a.agreementId === agreement.agreementId);

            if (updated && updated.status === agreement.status) {
                // Status hasn't changed yet (e.g. async settlement) —
                // unblock the button after 15s; the auto-poll in
                // useWorkflowData will refresh the list when it flips
                setTimeout(() => setActiveAction(null), 15_000);
            } else {
                setActiveAction(null);
            }

            if (identity.role === 'admin') {
                await Promise.all([loadEvents(), loadLedger()]);
            }
        } catch (caughtError) {
            setActionError(caughtError instanceof Error ? caughtError.message : 'Unknown transition failure');
            setActiveAction(null);
        }
    };

    const onAmountChange = (value: string) => {
        setForm((current) => ({ ...current, amount: value }));
    };

    const onPartnerIdChange = (value: string) => {
        setForm((current) => ({ ...current, partnerId: value }));
    };

    return {
        actionError,
        activeAction,
        error,
        form,
        idempotencyKey,
        isSubmitting,
        onAmountChange,
        onPartnerIdChange,
        resetForSignOut,
        result,
        runCreateAgreement,
        runTransition,
    };
};
