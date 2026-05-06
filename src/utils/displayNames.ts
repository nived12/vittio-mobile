// Shared display-name resolution. Every display-name path must use these
// to guarantee a non-empty fallback and consistent priority chains.

// Priority: custom_name → bank_name → name (API display_name) → account_type label → fallback
export function resolveBankAccountName(
    account: {
        custom_name?: string | null;
        bank_name?: string | null;
        account_type?: string;
        name?: string | null;
    },
    t: (key: string) => string,
): string {
    if (account.custom_name?.trim()) return account.custom_name.trim();
    if (account.bank_name?.trim()) return account.bank_name.trim();
    if (account.name?.trim()) return account.name.trim();
    if (account.account_type) {
        const typeKey = `accounts.types.${account.account_type}`;
        return t(typeKey);
    }
    return t('accounts.unknownAccount');
}

// Priority: concept → merchant → description → em-dash fallback
export function resolveTransactionLabel(
    concept?: string | null,
    merchant?: string | null,
    description?: string | null,
): string {
    if (concept?.trim()) return concept.trim();
    if (merchant?.trim()) return merchant.trim();
    if (description?.trim()) return description.trim();
    return '—';
}
