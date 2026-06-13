// Shared budget logic — used BOTH server-side (initial check) and client-side
// (recomputed live so "add balance" / "buy" instantly update the buttons). Pure
// (no next/server imports) so it's safe to import in a client component.

import type { Wallet } from "./wallet";
import { remaining } from "./wallet";
import type { BudgetCheck } from "./artifacts";

const inr = (n: number) => n.toLocaleString("en-IN");

export function computeBudget(total: number, wallet: Wallet): BudgetCheck {
  const left = remaining(wallet);
  const remainingAfter = left - total;
  const fits = total <= left;
  const cur = wallet.currency;
  let action: BudgetCheck["action"];
  let note: string;
  if (!fits) {
    action = "blocked";
    note = `This is ${cur}${inr(total - left)} over your ${cur}${inr(left)} left. It's the stronger pick and matches your history of premium buys — add the difference to go for it, or I'll find a cheaper option.`;
  } else if (total < wallet.autoApproveUnder) {
    action = "auto";
    note = `Routine buy — I'll place it for you. ${cur}${inr(remainingAfter)} left this month after.`;
  } else {
    action = "confirm";
    note = `${cur}${inr(remainingAfter)} would remain this month. Confirm and I'll order it.`;
  }
  return { total, remainingAfter, fits, action, note };
}
