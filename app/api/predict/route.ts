import { NextRequest, NextResponse } from "next/server";
import { completeChat, dropstoneKey, type Msg } from "@/lib/dropstone";
import { type Wallet, DEFAULT_WALLET } from "@/lib/wallet";
import { type PredictedNeed, localPredictions, eventPredictions } from "@/lib/predict";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `You are "Genie", a proactive Amazon shopping agent. Given the user's
recent purchases and spending categories, PREDICT 3 things they likely need to
reorder or buy soon — before they ask. Reason from timing (how long since a buy,
typical lifespan) and seasonality. Be specific and genuinely useful.

Respond with ONLY valid minified JSON, no markdown, no code fences:
{"predictions":[{"title":string,"reason":string,"query":string,"image":string,"urgency":"due|soon|heads-up"}]}
- title: short ("Reorder coffee beans")
- reason: one line tied to timing/usage ("Bought 3 weeks ago, typically lasts ~4")
- query: what the user would say to act on it ("Reorder my coffee beans")
- image: 2-3 product keywords for a photo
- urgency: due (now) | soon | heads-up`;

function parse(text: string): PredictedNeed[] | null {
  const s = text.indexOf("{");
  const e = text.lastIndexOf("}");
  if (s === -1 || e === -1) return null;
  try {
    const obj = JSON.parse(text.slice(s, e + 1));
    const arr = obj?.predictions;
    return Array.isArray(arr) && arr.length ? (arr as PredictedNeed[]) : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  let wallet: Wallet = DEFAULT_WALLET;
  try {
    const body = await req.json();
    wallet = body?.wallet ?? DEFAULT_WALLET;
  } catch { /* default */ }

  const key = dropstoneKey();
  const model = process.env.DROPSTONE_MODEL || "dropstone-fast";
  if (!key || key.startsWith("paste-")) {
    return NextResponse.json({ predictions: localPredictions(wallet) });
  }

  const history = wallet.recentPurchases.map((p) => `${p.name} (${p.when}, ${wallet.currency}${p.price})`).join("; ");
  const cats = wallet.categories.map((c) => `${c.name}`).join(", ");
  const context: Msg[] = [
    { role: "system", content: SYSTEM },
    { role: "user", content: `Recent purchases: ${history || "none"}. Categories I shop: ${cats}. Predict what I'll need next.` },
  ];

  // Always lead with upcoming-occasion gift predictions, then the model's reorders.
  const events = eventPredictions();
  try {
    const text = await completeChat(key, model, context);
    const reorder = (parse(text) ?? localPredictions(wallet)).filter((p) => p.kind !== "gift");
    return NextResponse.json({ predictions: [...events, ...reorder].slice(0, 4) });
  } catch {
    return NextResponse.json({ predictions: localPredictions(wallet) });
  }
}
