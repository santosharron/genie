import { NextRequest, NextResponse } from "next/server";
import { readdirSync } from "fs";
import path from "path";
import { completeChat, dropstoneKey, type Msg } from "@/lib/dropstone";
import { type Wallet, DEFAULT_WALLET, walletSummary } from "@/lib/wallet";
import { type Artifact, type AgentResponse, artifactTotal } from "@/lib/artifacts";
import { computeBudget } from "@/lib/budget";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The product photos we actually ship live in /public/products. We read that
// folder once and hand the AI the exact list, so every "image" it picks maps to a
// real bundled photo. To add a new photo: just drop it in /public/products — it's
// automatically offered to the AI here, no code change needed.
let imageCatalog: string[] | null = null;
function productImageCatalog(): string[] {
  if (imageCatalog) return imageCatalog;
  try {
    const dir = path.join(process.cwd(), "public", "products");
    const slugs = new Set<string>();
    for (const f of readdirSync(dir)) {
      const m = f.match(/^(.+)\.(jpe?g|png|webp)$/i);
      if (m) slugs.add(m[1].toLowerCase());
    }
    imageCatalog = [...slugs].sort();
  } catch {
    imageCatalog = [];
  }
  return imageCatalog;
}

const SYSTEM = `You are "Genie", an autonomous shopping agent inside Amazon. The user
texts you in a few casual words. You do all the work. You meet the user wherever
they are on the CERTAINTY spectrum and reply with ONE of four modes:

- "frictionless": the user already knows the product/category (e.g. "refill my
  groceries", "buy AAA batteries"). You optimise the choice: best pick + a couple
  of alternatives, and suggest a reorder cadence for routine items.
- "intent": the user knows an OUTCOME but not the products (e.g. "I want to run
  650km", "packing for a 5-day Goa trip", "starting pour-over coffee"). You decompose
  the goal into the items they actually need (a trip may need 4-6 items), and for
  each, judge durability / reviews / fit for THIS goal. The user can approve or
  remove individual items, so include everything genuinely useful. For a TRIP,
  factor the DESTINATION's climate for the current month/season (monsoon → rain gear;
  a hill station like Kodaikanal → warm layers + rain protection) into the rationale
  and item choices.

When you return an intent kit, your "reply" should briefly invite the user to tap
"Have it" on anything they already own so you only buy what's missing.

ON A FOLLOW-UP, revise the CURRENT ARTIFACT shown on screen: the user may ask to
swap one item ("change the bottle", "a Nike shoe instead"), show another option,
add or drop an item, or go cheaper/premium — keep the unaffected items as they are.
- "emergency": the user has a problem to solve NOW (e.g. "sink is leaking",
  "baby has a fever at 2am"). You return the ONE thing to buy and the fastest
  delivery. Decisive, calm.
- "clarify": you genuinely lack a key fact to choose well (budget, size, recipient,
  occasion, room/colour). Ask ONE short, friendly question. Return artifact: null.
  Prefer clarify when a wrong guess would waste money.

You are given the user's WALLET. Respect it: prefer choices within the remaining
budget. BUT if the genuinely better pick (one that matches the user's history of
premium buys) costs more than the budget, you MAY recommend it — the system will
offer the user an "add balance" option. Don't silently downgrade quality to fit.
(You do NOT compute the budget math — the system does that.)

EXPLAIN YOURSELF. Every product's "why" must connect to (a) the specific occasion/
goal and (b) a concrete review/spec signal (rating, review count, durability, fit).
e.g. "Lasts 600-800km (1.2k reviews) — covers your full 650km goal".

Every product needs an "image": the SINGLE best-matching id from the IMAGE CATALOG
provided below. Use the id EXACTLY as written (e.g. "shoes", "jacket", "fishing").
NEVER invent an id that isn't in the catalog — pick the closest one, and if nothing
fits, use "gift". (The product "name" stays a real specific product; only "image"
is constrained to the catalog.)

If a frictionless "pick" is a COMBO of multiple products (e.g. "Rice + Dal + Oil"),
also return "bundle" — one entry per component with its own name, image keywords,
price, rating and reviews. The component prices should add up to the pick's total
price. Omit "bundle" for single-product picks.

Use REAL, accurate product names that exist on Amazon India (e.g. "Tata Salt 1kg",
"Aashirvaad Atta 5kg", "Fortune Sunflower Oil 1L", "Tata Sampann Toor Dal 1kg").
NEVER invent a name or merge two different staples into one product — salt and sugar
are SEPARATE items, so never produce something like "Tata Salted Sugar". Each grocery
staple must be its own distinct, correctly-named bundle entry.

"thinking_steps" = 3 to 6 SHORT past-tense actions that show you working, e.g.
"Scanned 482 reviews", "Checked durability: 600-800km", "Matched your budget".
Make them specific and real-sounding. When the request involves a PLACE or TRIP,
the steps must show place-awareness: name the destination, check its CLIMATE for the
current month, and reference consulting place reviews (Google Maps) and product
reviews — e.g. "Checked Kodaikanal weather for June: 13-20C, monsoon showers",
"Read Google Maps reviews on Kodaikanal travel", "Searched web reviews for waterproof
gear", "Picked rain protection for the season".

Respond with ONLY valid minified JSON, no markdown, no code fences, this schema:
{"mode":"frictionless|intent|emergency|clarify",
 "thinking_steps":[string],
 "reply":string,
 "artifact": null OR one of:
   {"kind":"frictionless","title":string,
    "pick":{"name":string,"price":number,"rating":number,"reviews":number,"image":string,"why":[string],"tradeoff":string},
    "bundle":[{"name":string,"image":string,"price":number,"rating":number,"reviews":number}],
    "alternatives":[{"name":string,"price":number,"note":string}],
    "reorder":{"suggested":boolean,"cadence":string}}
   {"kind":"intent","goal":string,"rationale":string,
    "items":[{"name":string,"price":number,"rating":number,"reviews":number,"role":string,"image":string,"why":[string],"tradeoff":string}]}
   {"kind":"emergency","situation":string,"urgency":string,"delivery":string,
    "pick":{"name":string,"price":number,"rating":number,"reviews":number,"image":string,"why":[string],"tradeoff":string}}
}
Prices are plain numbers in the user's currency, no symbols. NEVER use the ₹ symbol
anywhere in your output — write amounts as plain numbers (or "Rs 2999"). Keep the
artifact's TOTAL within the user's remaining budget whenever feasible — pick
budget-appropriate products, not flagship-priced ones, unless the user asks for premium.
Keep "reply" to 1-2 warm sentences.`;

function parseAgent(text: string): AgentResponse | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as AgentResponse;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const key = dropstoneKey();
  const model = process.env.DROPSTONE_MODEL || "dropstone-fast";
  if (!key || key.startsWith("paste-")) {
    return NextResponse.json({ error: "DROPSTONE_API_KEY (or DROPSTONE_JWT) is not set" }, { status: 500 });
  }

  let history: { role: string; content: string }[] = [];
  let artifact: Artifact | null = null;
  let wallet: Wallet = DEFAULT_WALLET;
  try {
    const body = await req.json();
    history = Array.isArray(body?.messages) ? body.messages : [];
    artifact = body?.artifact ?? null;
    wallet = body?.wallet ?? DEFAULT_WALLET;
  } catch {
    /* fall through */
  }
  if (!history.length) {
    return NextResponse.json({ error: "No message to act on." }, { status: 400 });
  }

  // Context the agent sees every turn: wallet snapshot + the artifact currently on
  // screen (so follow-ups like "cheaper" edit the exact thing the user is seeing).
  const today = new Date();
  const context: Msg[] = [
    { role: "system", content: SYSTEM },
    { role: "system", content: `USER WALLET: ${walletSummary(wallet)}` },
    { role: "system", content: `Today is ${today.toDateString()} (month: ${today.toLocaleString("en-US", { month: "long" })}). For any trip or seasonal request, reason about the DESTINATION's climate for THIS month/season and pick products that suit it.` },
    { role: "system", content: `IMAGE CATALOG — the "image" field of EVERY product (pick/bundle/item) must be EXACTLY one of these ids: ${productImageCatalog().join(", ")}. If none fit, use "gift".` },
  ];
  if (artifact) {
    context.push({ role: "system", content: `CURRENT ARTIFACT ON SCREEN (revise this if the user is following up): ${JSON.stringify(artifact)}` });
  }
  for (const m of history) {
    if (m.role === "user" || m.role === "assistant") {
      context.push({ role: m.role as "user" | "assistant", content: m.content });
    }
  }

  try {
    const text = await completeChat(key, model, context);
    const parsed = parseAgent(text);
    if (!parsed) {
      return NextResponse.json({ error: "Could not parse the agent response.", raw: text }, { status: 502 });
    }
    // Attach the deterministic budget check.
    if (parsed.artifact) {
      parsed.artifact.budget = computeBudget(artifactTotal(parsed.artifact), wallet);
    }
    if (!Array.isArray(parsed.thinking_steps)) parsed.thinking_steps = [];
    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
