import type { Session } from '@supabase/supabase-js';
import type { AuthRole, SessionIdentity, SupabaseJwtClaims } from '../../../shared/auth-contract';

const decodeJwtClaims = (token: string): SupabaseJwtClaims | null => {
    const [, payload] = token.split('.');

    if (!payload) {
        return null;
    }

    try {
        const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
        const decoded = atob(padded);
        const utf8 = decodeURIComponent(
            Array.from(decoded)
                .map((character) => `%${character.charCodeAt(0).toString(16).padStart(2, '0')}`)
                .join(''),
        );
        return JSON.parse(utf8) as SupabaseJwtClaims;
    } catch {
        return null;
    }
};

export const getSessionIdentity = (session: Session): SessionIdentity | null => {
    const claims = decodeJwtClaims(session.access_token);
    if (!claims?.sub || !claims.app_role || !['merchant', 'partner', 'admin'].includes(claims.app_role)) {
        return null;
    }

    if (claims.app_role === 'merchant' && !claims.merchant_id) {
        return null;
    }

    if (claims.app_role === 'partner' && !claims.partner_id) {
        return null;
    }

    return {
        subject: claims.sub,
        role: claims.app_role as AuthRole,
        merchantId: claims.merchant_id,
        partnerId: claims.partner_id,
        email: claims.email ?? session.user.email,
    };
};

export const formatRoleLabel = (role: AuthRole): string => role.charAt(0).toUpperCase() + role.slice(1);

export const identitySummary = (identity: SessionIdentity): string => {
    if (identity.role === 'merchant') {
        return `merchantId=${identity.merchantId}`;
    }

    if (identity.role === 'partner') {
        return `partnerId=${identity.partnerId}`;
    }

    return 'read-only inspector';
};
