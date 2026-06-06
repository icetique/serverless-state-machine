import type { DemoAccount } from '../types';

const getValue = (envKey: string): string => {
    const value: string | undefined = (import.meta.env as Record<string, string | undefined>)[envKey];
    if (!value) {
        throw new Error(`${envKey} must be set to load demo accounts`);
    }
    return value;
};

export const demoAccounts: DemoAccount[] = [
    {
        label: 'Merchant',
        email: getValue('VITE_DEMO_MERCHANT_EMAIL'),
        password: getValue('VITE_DEMO_MERCHANT_PASSWORD'),
    },
    {
        label: 'Partner',
        email: getValue('VITE_DEMO_PARTNER_EMAIL'),
        password: getValue('VITE_DEMO_PARTNER_PASSWORD'),
    },
    {
        label: 'Admin',
        email: getValue('VITE_DEMO_ADMIN_EMAIL'),
        password: getValue('VITE_DEMO_ADMIN_PASSWORD'),
    },
];
