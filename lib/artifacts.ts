// The artifacts the agent can return — one per "certainty mode". The agent picks
// exactly one kind (or returns none and asks a question). Prices are plain numbers
// so the server can do the budget math reliably.

export interface Product {
  name: string;
  price: number;
  rating?: number; // e.g. 4.6
  reviews?: number; // e.g. 482
  role?: string; // for kit items: "Shoes", "Socks"…
  image?: string; // 2-3 keywords for a product photo, e.g. "asics running shoe"
  why: string[]; // why it fits THIS user / goal
  tradeoff?: string; // the one honest caveat
}

// Server-computed (never trusted from the model): does this fit the budget, and
// is the agent allowed to place it itself or must it ask?
export interface BudgetCheck {
  total: number;
  remainingAfter: number;
  fits: boolean;
  action: "auto" | "confirm" | "blocked";
  note: string;
}

// One component of a combo pick (e.g. the Rice in a Rice+Dal+Oil bundle).
export interface BundleItem {
  name: string;
  image?: string;
  price?: number;
  rating?: number;
  reviews?: number;
}

export interface FrictionlessArtifact {
  kind: "frictionless";
  title: string;
  pick: Product;
  bundle?: BundleItem[]; // when the pick is a multi-product combo
  alternatives: { name: string; price: number; note: string }[];
  reorder?: { suggested: boolean; cadence: string };
  budget?: BudgetCheck;
}

export interface IntentArtifact {
  kind: "intent";
  goal: string;
  rationale: string;
  items: Product[];
  budget?: BudgetCheck;
}

export interface EmergencyArtifact {
  kind: "emergency";
  situation: string;
  pick: Product;
  urgency: string;
  delivery: string;
  budget?: BudgetCheck;
}

export type Artifact = FrictionlessArtifact | IntentArtifact | EmergencyArtifact;

export type Mode = "frictionless" | "intent" | "emergency" | "clarify";

export interface AgentResponse {
  mode: Mode;
  thinking_steps: string[]; // short past-tense actions, shown as the agent "working"
  reply: string; // 1–2 sentence conversational reply
  artifact: Artifact | null; // null when mode === "clarify"
}

// Total cost of whatever the artifact proposes to buy.
export function artifactTotal(a: Artifact): number {
  if (a.kind === "intent") return a.items.reduce((s, i) => s + (i.price || 0), 0);
  return a.pick?.price || 0;
}
