// The user's spending profile. For the demo this is a mock object; in production
// it would come from Amazon Pay transaction history + order history. The agent
// reads this every turn so it can keep choices inside the budget and decide what
// it's allowed to auto-place vs. what it should confirm first.

export interface Wallet {
  currency: string;
  monthlyBudget: number;
  spentThisMonth: number;
  autoApproveUnder: number; // routine items under this, if in budget, the agent just places
  categories: { name: string; cap: number; spent: number }[];
  recentPurchases: { name: string; price: number; when: string }[];
}

export const DEFAULT_WALLET: Wallet = {
  currency: "₹",
  monthlyBudget: 15000,
  spentThisMonth: 10800,
  autoApproveUnder: 1500,
  categories: [
    { name: "Groceries", cap: 6000, spent: 5200 },
    { name: "Fitness", cap: 4000, spent: 600 },
    { name: "Home", cap: 3000, spent: 1400 },
  ],
  recentPurchases: [
    { name: "ASICS running shoes", price: 2799, when: "last month" },
    { name: "Monthly groceries", price: 1380, when: "3 weeks ago" },
  ],
};

export function remaining(w: Wallet): number {
  return w.monthlyBudget - w.spentThisMonth;
}

// Short line the agent gets as context. Uses "Rs" (not the ₹ glyph) on purpose:
// the multibyte ₹ can get mojib'd on the model round-trip. The UI renders ₹ itself.
export function walletSummary(w: Wallet): string {
  const cats = w.categories.map(c => `${c.name} Rs${c.spent}/${c.cap}`).join(", ");
  return `Monthly spending limit Rs${w.monthlyBudget} (the user set this), spent Rs${w.spentThisMonth}, remaining Rs${remaining(w)}. Never exceed the remaining without flagging it. Auto-approve routine buys under Rs${w.autoApproveUnder}. Category caps: ${cats}.`;
}
