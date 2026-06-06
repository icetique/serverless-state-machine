import type { FormEvent } from 'react';
import type { SessionIdentity } from '../../../shared/auth-contract';
import { formatRoleLabel, identitySummary } from '../auth/sessionIdentity';
import { canViewAgreementAction, getActionTone, getStatusTone } from '../workflow';
import type {
    AgreementResult,
    AgreementSummary,
    EventRecord,
    FormState,
    LedgerEntry,
    TransitionAction,
} from '../types';

type WorkflowDashboardProps = {
    actionError: string | null;
    activeAction: string | null;
    agreements: AgreementSummary[];
    agreementsError: string | null;
    authError: string | null;
    error: string | null;
    events: EventRecord[];
    eventsError: string | null;
    form: FormState;
    idempotencyKey: string;
    identity: SessionIdentity;
    isAdmin: boolean;
    isLoadingAgreements: boolean;
    isLoadingEvents: boolean;
    isLoadingLedger: boolean;
    isManualSettlementTriggerEnabled: boolean;
    isMerchant: boolean;
    isSigningOut: boolean;
    isSubmitting: boolean;
    ledgerEntries: LedgerEntry[];
    ledgerError: string | null;
    onAmountChange: (value: string) => void;
    onCreateAgreement: (event: FormEvent<HTMLFormElement>) => void;
    onPartnerIdChange: (value: string) => void;
    onRefresh: () => void;
    onSignOut: () => void;
    onTransition: (agreement: AgreementSummary, action: TransitionAction) => void;
    result: AgreementResult | null;
};

export function WorkflowDashboard({
    actionError,
    activeAction,
    agreements,
    agreementsError,
    authError,
    error,
    events,
    eventsError,
    form,
    idempotencyKey,
    identity,
    isAdmin,
    isLoadingAgreements,
    isLoadingEvents,
    isLoadingLedger,
    isManualSettlementTriggerEnabled,
    isMerchant,
    isSigningOut,
    isSubmitting,
    ledgerEntries,
    ledgerError,
    onAmountChange,
    onCreateAgreement,
    onPartnerIdChange,
    onRefresh,
    onSignOut,
    onTransition,
    result,
}: WorkflowDashboardProps) {
    return (
        <main className="shell">
            <header className="hero">
                <div className="panel auth-bar">
                    <div className="auth-summary">
                        <strong>{identity.email ?? identity.subject}</strong>
                        <span>{formatRoleLabel(identity.role)}</span>
                        <small className="session-meta">{identitySummary(identity)}</small>
                    </div>
                    <div className="auth-actions">
                        <span className="badge muted">Supabase JWT</span>
                        <button className="secondary-button" disabled={isSigningOut} onClick={onSignOut} type="button">
                            {isSigningOut ? 'Signing Out…' : 'Sign Out'}
                        </button>
                    </div>
                </div>
                <p className="eyebrow">Payments Example</p>
                <h1>Agreement Workflow Control Plane</h1>
                <p className="lede">
                    Create agreements, advance them through approval, funding, and settlement, and inspect the event
                    stream and ledger with admin-scoped access.
                </p>
            </header>

            <section className="grid">
                <div className="merchant-stack">
                    {isMerchant ? (
                        <section className="panel form-panel">
                            <div className="panel-header">
                                <h2>Create Agreement</h2>
                                <span className="badge">Merchant Only</span>
                            </div>
                            <form onSubmit={onCreateAgreement}>
                                <label>
                                    Merchant ID
                                    <input readOnly value={form.merchantId} />
                                </label>
                                <p className="helper-text locked-input-note">
                                    Locked from JWT claim <code>merchant_id</code>.
                                </p>
                                <label>
                                    Partner ID
                                    <input
                                        onChange={(event) => onPartnerIdChange(event.target.value)}
                                        value={form.partnerId}
                                    />
                                </label>
                                <label>
                                    Amount
                                    <input
                                        inputMode="numeric"
                                        min="1"
                                        onChange={(event) => onAmountChange(event.target.value)}
                                        value={form.amount}
                                    />
                                </label>
                                <button className="primary-button" disabled={isSubmitting} type="submit">
                                    {isSubmitting ? 'Creating…' : 'Create Agreement'}
                                </button>
                                <p className="helper-text">
                                    Current idempotency key:
                                    <br />
                                    <code>{idempotencyKey}</code>
                                </p>
                            </form>
                        </section>
                    ) : null}

                    <section className="panel response-panel">
                        <div className="panel-header">
                            <h2>Latest Response</h2>
                            <span className="badge muted">JSON</span>
                        </div>
                        {result ? (
                            <pre className="response">{JSON.stringify(result, null, 2)}</pre>
                        ) : (
                            <div className="empty-state">Run a workflow command to inspect the latest response.</div>
                        )}
                        {error ? <pre className="response error">{error}</pre> : null}
                        {actionError ? <pre className="response error">{actionError}</pre> : null}
                        {authError ? <pre className="response error">{authError}</pre> : null}
                    </section>
                </div>

                <section className="panel response-panel">
                    <div className="panel-header">
                        <h2>Agreements</h2>
                        <div className="panel-header-actions">
                            <button
                                className="secondary-button"
                                disabled={isLoadingAgreements}
                                onClick={onRefresh}
                                type="button"
                            >
                                {isLoadingAgreements ? 'Refreshing…' : 'Refresh'}
                            </button>
                            <span className="badge muted">{isLoadingAgreements ? 'Loading…' : 'Scoped Read'}</span>
                        </div>
                    </div>
                    {agreementsError ? <pre className="response error">{agreementsError}</pre> : null}
                    {isLoadingAgreements && agreements.length === 0 ? (
                        <div className="empty-state">Loading agreements…</div>
                    ) : agreements.length === 0 ? (
                        <div className="empty-state">No agreements visible for this account yet.</div>
                    ) : (
                        <div className="agreements-list">
                            {agreements.map((agreement) => (
                                <article className="agreement-card" key={agreement.agreementId}>
                                    <div className="event-card-header agreement-card-header">
                                        <div>
                                            <strong>{agreement.agreementId}</strong>
                                            <div className="event-meta">
                                                <span>merchant: {agreement.merchantId}</span>
                                                <span>partner: {agreement.partnerId}</span>
                                                <span>amount: {agreement.amount}</span>
                                            </div>
                                        </div>
                                        <span className={`status-pill status-pill--${getStatusTone(agreement.status)}`}>
                                            {agreement.status}
                                        </span>
                                    </div>

                                    {!isManualSettlementTriggerEnabled && agreement.status === 'FUNDED' ? (
                                        <div className="response warning" style={{ marginBottom: '10px' }}>
                                            Settlement via SQS pending, ~1 minute. Refreshing every 10 seconds.
                                        </div>
                                    ) : null}

                                    <div className="actions-row">
                                        {(['approve', 'fund', 'settle'] as TransitionAction[]).map((action) => {
                                            const isVisible = canViewAgreementAction(
                                                identity,
                                                agreement,
                                                action,
                                                isManualSettlementTriggerEnabled,
                                            );

                                            if (!isVisible) {
                                                return null;
                                            }

                                            const actionKey = `${agreement.agreementId}:${action}`;

                                            return (
                                                <button
                                                    className={`secondary-button secondary-button--${getStatusTone(
                                                        getActionTone(action),
                                                    )}`}
                                                    disabled={activeAction === actionKey}
                                                    key={action}
                                                    onClick={() => onTransition(agreement, action)}
                                                    type="button"
                                                >
                                                    {activeAction === actionKey
                                                        ? `${action[0].toUpperCase()}${action.slice(1)}…`
                                                        : action[0].toUpperCase() + action.slice(1)}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </section>

            {isAdmin ? (
                <section className="grid admin-panel">
                    <section className="panel response-panel admin-panel-section">
                        <div className="panel-header">
                            <h2>Ledger</h2>
                            <span className="badge muted">{isLoadingLedger ? 'Loading…' : 'Admin Only'}</span>
                        </div>
                        {ledgerError ? <pre className="response error">{ledgerError}</pre> : null}
                        {isLoadingLedger && ledgerEntries.length === 0 ? (
                            <div className="empty-state">Loading ledger…</div>
                        ) : ledgerEntries.length === 0 ? (
                            <div className="empty-state">No ledger entries yet.</div>
                        ) : (
                            <div className="event-list">
                                {ledgerEntries.map((entry) => (
                                    <article className="event-card" key={entry.transactionId}>
                                        <div className="event-card-header">
                                            <strong>{entry.transactionId}</strong>
                                            <span>{entry.createdAt}</span>
                                        </div>
                                        <div className="event-meta">
                                            <span>agreement: {entry.agreementId}</span>
                                            <span>entry: {entry.entryType}</span>
                                            <span>amount: {entry.amount}</span>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="panel response-panel admin-panel-section admin-event-stream">
                        <div className="panel-header">
                            <h2>Event Stream</h2>
                            <span className="badge muted">{isLoadingEvents ? 'Loading…' : 'Admin Only'}</span>
                        </div>
                        {eventsError ? <pre className="response error">{eventsError}</pre> : null}
                        {isLoadingEvents && events.length === 0 ? (
                            <div className="empty-state">Loading events…</div>
                        ) : events.length === 0 ? (
                            <div className="empty-state">No persisted events yet.</div>
                        ) : (
                            <div className="event-list">
                                {events.map((event) => (
                                    <article className="event-card" key={event.id}>
                                        <div className="event-card-header">
                                            <strong>{event.eventType}</strong>
                                            <span>{event.createdAt}</span>
                                        </div>
                                        <div className="event-meta">
                                            <span>agreement: {event.agreementId}</span>
                                            <span>request: {event.requestId}</span>
                                            <span>idem: {event.idempotencyKey}</span>
                                        </div>
                                        <pre className="response">{JSON.stringify(event.payload, null, 2)}</pre>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                </section>
            ) : null}
        </main>
    );
}
