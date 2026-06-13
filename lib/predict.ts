// Proactive "need prediction" — Genie anticipates what you'll need before you ask
// (the "Predictive & Confident" area). Two kinds: reorders (from purchase history)
// and gifts (from upcoming occasions Genie remembers). Model-backed via /api/predict,
// with this instant local fallback so the landing never blanks.

import type { Wallet } from "./wallet";

export interface PredictedNeed {
  title: string;
  reason: string;
  query: string; // what gets sent to the agent when tapped
  image?: string; // keywords for the thumbnail
  urgency?: "due" | "soon" | "heads-up";
  kind?: "reorder" | "gift";
}

export interface UpcomingEvent {
  who: string;
  occasion: string;
  inDays: number;
  likes: string;
  budget: number;
}

// People + occasions Genie remembers (in production this comes from the user's
// account / past gifting; here it's seeded). This powers proactive GIFT prediction.
export const UPCOMING_EVENTS: UpcomingEvent[] = [
  { who: "Dad", occasion: "60th birthday", inDays: 5, likes: "fishing and gardening", budget: 3000 },
];

export function eventPredictions(): PredictedNeed[] {
  return UPCOMING_EVENTS.map((e) => ({
    title: `${e.who}'s ${e.occasion} in ${e.inDays} days`,
    reason: `${e.who} loves ${e.likes} — want me to pick the gift?`,
    query: `Gift for ${e.who}'s ${e.occasion}. ${e.who} loves ${e.likes}. Budget ${e.budget}.`,
    image: e.likes.split(/[\s,]+/)[0], // "fishing" → fishing photo
    urgency: e.inDays <= 3 ? "due" : "soon",
    kind: "gift",
  }));
}

export function localPredictions(w: Wallet): PredictedNeed[] {
  const reorder: PredictedNeed[] = w.recentPurchases.slice(0, 2).map((p) => ({
    title: `Reorder ${p.name}`,
    reason: `Bought ${p.when} — you'll likely be running low soon`,
    query: `Reorder ${p.name}`,
    image: p.name,
    urgency: "due",
    kind: "reorder",
  }));
  reorder.push({
    title: "Monthly essentials top-up",
    reason: "You usually restock household items around now",
    query: "Top up my monthly household essentials",
    image: "groceries",
    urgency: "soon",
    kind: "reorder",
  });
  return [...eventPredictions(), ...reorder].slice(0, 4);
}
