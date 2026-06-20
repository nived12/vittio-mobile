// Shared types for savings/debts advanced calculation settings.

/** How a transaction type affects savings/debt progress. */
export type CalcRule = 'positive' | 'negative' | 'ignore';

/** The hash the API returns under `calculation_settings`. */
export interface CalculationSettings {
  income?: CalcRule;
  expense?: CalcRule;
  transfer_in?: CalcRule;
  transfer_out?: CalcRule;
}

/**
 * Flat keys the create/update endpoints accept (the API transforms these into
 * the `calculation_settings` hash server-side).
 */
export interface CalculationSettingsBody {
  calculation_settings_income?: CalcRule;
  calculation_settings_expense?: CalcRule;
  calculation_settings_transfer_in?: CalcRule;
  calculation_settings_transfer_out?: CalcRule;
}

// Sensible defaults matching the server's FinancialTemplate constants.
export const SAVING_CALC_DEFAULT: Required<CalculationSettings> = {
  income: 'positive',
  expense: 'negative',
  transfer_in: 'positive',
  transfer_out: 'negative',
};

export const DEBT_CALC_DEFAULT: Required<CalculationSettings> = {
  income: 'positive',
  expense: 'negative',
  transfer_in: 'positive',
  transfer_out: 'ignore',
};

/** Merge a (possibly empty) settings hash onto the variant defaults. */
export function mergeCalc(
  variant: 'saving' | 'debt',
  partial?: CalculationSettings | Record<string, string> | null,
): Required<CalculationSettings> {
  const base = variant === 'debt' ? DEBT_CALC_DEFAULT : SAVING_CALC_DEFAULT;
  return { ...base, ...(partial as CalculationSettings) };
}

/** Convert the settings hash into the flat keys the API expects. */
export function calcToBody(calc: CalculationSettings): CalculationSettingsBody {
  return {
    calculation_settings_income: calc.income,
    calculation_settings_expense: calc.expense,
    calculation_settings_transfer_in: calc.transfer_in,
    calculation_settings_transfer_out: calc.transfer_out,
  };
}

/** Resolve a category by its (Spanish) name across the parent/child hierarchy. */
export function findCategoryIdByName(
  categories: Array<{ id: number; name: string; children?: Array<{ id: number; name: string }> }>,
  name: string,
): number | undefined {
  for (const parent of categories) {
    if (parent.name === name) return parent.id;
    const child = (parent.children ?? []).find((c) => c.name === name);
    if (child) return child.id;
  }
  return undefined;
}
