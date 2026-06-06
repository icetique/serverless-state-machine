// Canonical source for UI-facing auth types.
// If you add or change a field here, update the matching types in
// layers/lambda-utils/src/index.ts (AuthRole, AuthContext).

export type AuthRole = 'merchant' | 'partner' | 'admin';

export interface AuthContext {
    subject: string;
    role: AuthRole;
    merchantId?: string;
    partnerId?: string;
}

export interface SupabaseJwtClaims {
    sub: string;
    email?: string;
    app_role?: AuthRole;
    merchant_id?: string;
    partner_id?: string;
}

export interface SessionIdentity extends AuthContext {
    email?: string;
}
