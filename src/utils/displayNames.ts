/**
 * Shared display-name resolution utilities.
 *
 * Every display-name resolution across the app must use these functions
 * to guarantee a non-empty fallback and consistent priority chains.
 */

/**
 * Resolves the display name for a bank account.
 * Priority: custom_name → bank_name → name (API display_name) → account_type label → fallback
 *
 * Works with any object that has at least one of the recognized name fields.
 * Designed to accept BankAccount, DashboardBankAccount, or partial shapes from
 * transaction responses (where bank_account.name is the API-computed display_name).
 */
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
    // `name` is the API-computed display_name (always non-null from the server)
    if (account.name?.trim()) return account.name.trim();
    // Last resort: account type label
    if (account.account_type) {
        const typeKey = `accounts.types.${account.account_type}`;
        return t(typeKey);
    }
    return t('accounts.unknownAccount');
}

/**
 * Resolves the primary label for a transaction row.
 * Priority: concept → merchant → description → em-dash fallback.
 *
 * All parameters are optional and nullable — the function handles empty strings
 * and whitespace-only values gracefully.
 */
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
