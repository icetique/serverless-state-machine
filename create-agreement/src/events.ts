import {
    AGREEMENT_EVENT_SOURCE,
    AGREEMENT_CREATED_DETAIL_TYPE,
    AGREEMENT_APPROVED_DETAIL_TYPE,
    AGREEMENT_FUNDED_DETAIL_TYPE,
    AGREEMENT_SETTLED_DETAIL_TYPE,
} from '@payments-example/lambda-utils';
import type { AgreementEventType, AgreementStatus } from '@payments-example/lambda-utils';

export {
    AGREEMENT_CREATED_DETAIL_TYPE,
    AGREEMENT_APPROVED_DETAIL_TYPE,
    AGREEMENT_FUNDED_DETAIL_TYPE,
    AGREEMENT_SETTLED_DETAIL_TYPE,
    AGREEMENT_EVENT_SOURCE,
};
export type { AgreementEventType, AgreementStatus };

export interface AgreementEventDetail {
    agreementId: string;
    merchantId: string;
    partnerId: string;
    amount: number;
    previousStatus: string | null;
    newStatus: string;
}

export interface AgreementDomainEvent {
    source: string;
    detailType: string;
    detail: AgreementEventDetail;
}

export const buildAgreementEvent = (
    detailType: AgreementEventType,
    detail: AgreementEventDetail,
): AgreementDomainEvent => ({
    source: AGREEMENT_EVENT_SOURCE,
    detailType,
    detail,
});
