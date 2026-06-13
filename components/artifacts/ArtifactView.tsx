"use client";

import { Fragment, useState } from "react";
import { Check, X, Star, RefreshCw, Zap, Truck, Target, ShieldCheck, Wallet as WalletIcon, Plus } from "lucide-react";
import type { Artifact, BudgetCheck, BundleItem, Product } from "@/lib/artifacts";
import type { Wallet } from "@/lib/wallet";
import { computeBudget } from "@/lib/budget";
import { ProductImage } from "@/components/ProductImage";

const ORANGE = "#FF9900";
const money = (w: Wallet, n: number) => `${w.currency}${n.toLocaleString("en-IN")}`;

// onPlace receives exactly what to buy — so a kit can pass only the APPROVED items.
type Place = (title: string, total: number, image?: string) => void;

function Rating({ p }: { p: Product }) {
  if (!p.rating) return null;
  return (
    <span className="flex items-center gap-1 text-sm text-muted-foreground">
      <Star className="size-3.5 fill-[#FF9900] text-[#FF9900]" />
      {p.rating}
      {p.reviews ? <span className="text-muted-foreground/70">({p.reviews.toLocaleString("en-IN")})</span> : null}
    </span>
  );
}

function WhyList({ why }: { why: string[] }) {
  return (
    <ul className="mt-2 space-y-1.5">
      {why?.map((r, i) => (
        <li key={i} className="flex gap-2 text-[14px] leading-relaxed">
          <Check className="mt-0.5 size-4 shrink-0 text-emerald-400" />
          <span>{r}</span>
        </li>
      ))}
    </ul>
  );
}

function Tradeoff({ t }: { t?: string }) {
  if (!t) return null;
  return (
    <div className="mt-2 flex gap-2 text-[14px] leading-relaxed text-muted-foreground">
      <X className="mt-0.5 size-4 shrink-0 text-rose-400" />
      <span>{t}</span>
    </div>
  );
}

function BudgetBar({ budget, wallet, onBuy, onAddBalance, disabled }: {
  budget: BudgetCheck; wallet: Wallet; onBuy: () => void; onAddBalance: (amt: number) => void; disabled?: boolean;
}) {
  const meta = {
    auto: { label: "Auto-approved · within budget", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300", Icon: ShieldCheck },
    confirm: { label: "Within your budget", cls: "border-[#FF9900]/30 bg-[#FF9900]/10 text-[#FF9900]", Icon: WalletIcon },
    blocked: { label: "Over your spending limit", cls: "border-rose-500/30 bg-rose-500/10 text-rose-300", Icon: WalletIcon },
  }[budget.action];
  const StatusIcon = meta.Icon;
  const shortfall = Math.max(0, -budget.remainingAfter);
  return (
    <div className="border-t border-border px-6 py-4">
      <div className={`flex items-start gap-2.5 rounded-2xl border px-3.5 py-3 ${meta.cls}`}>
        <StatusIcon className="mt-0.5 size-4 shrink-0" />
        <div>
          <div className="text-[13px] font-semibold">{meta.label}</div>
          <div className="mt-0.5 text-[13px] leading-relaxed text-foreground/80">{budget.note}</div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">Total {money(wallet, budget.total)}</span>
        {budget.action === "blocked" ? (
          <button onClick={() => onAddBalance(shortfall)}
            className="flex items-center gap-1.5 rounded-full bg-[#FF9900] px-5 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90">
            <Plus className="size-4" /> Add {money(wallet, shortfall)} to wallet
          </button>
        ) : (
          <button onClick={onBuy} disabled={disabled}
            className={`rounded-full px-5 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-40 ${budget.action === "auto" ? "bg-emerald-500" : "bg-[#FF9900]"}`}>
            {budget.action === "auto" ? "✓ Place it for me" : `Confirm & buy · ${money(wallet, budget.total)}`}
          </button>
        )}
      </div>
    </div>
  );
}

function CardShell({ chip, chipIcon, title, sub, children, budget, wallet, onBuy, onAddBalance, disabled }: {
  chip: string; chipIcon: React.ReactNode; title: string; sub?: string; children: React.ReactNode;
  budget: BudgetCheck; wallet: Wallet; onBuy: () => void; onAddBalance: (amt: number) => void; disabled?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-2xl shadow-black/30">
      <div className="border-b border-border px-6 py-5">
        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide" style={{ color: ORANGE }}>
          {chipIcon}{chip}
        </div>
        <h2 className="mt-1.5 font-serif text-2xl font-medium">{title}</h2>
        {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      </div>
      <div className="px-6 py-5">{children}</div>
      <BudgetBar budget={budget} wallet={wallet} onBuy={onBuy} onAddBalance={onAddBalance} disabled={disabled} />
    </div>
  );
}

function PickHeader({ p, wallet }: { p: Product; wallet: Wallet }) {
  // A combo pick ("Rice + Dal + Oil") shows one image per item.
  const parts = p.name.split(/\s*\+\s*/).map((s) => s.trim()).filter(Boolean);
  const multi = parts.length > 1;
  if (multi) {
    return (
      <div>
        <div className="flex flex-wrap gap-2">
          {parts.slice(0, 4).map((q, i) => (
            <ProductImage key={i} query={q} className="size-16 shrink-0 rounded-xl border border-border" />
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <span className="font-medium" style={{ color: ORANGE }}>{money(wallet, p.price)}</span>
          <Rating p={p} />
        </div>
        <WhyList why={p.why} />
        <Tradeoff t={p.tradeoff} />
      </div>
    );
  }
  return (
    <div className="flex gap-4">
      <ProductImage query={p.image || p.name} className="size-20 shrink-0 rounded-2xl border border-border" />
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <span className="font-medium" style={{ color: ORANGE }}>{money(wallet, p.price)}</span>
          <Rating p={p} />
        </div>
        <WhyList why={p.why} />
        <Tradeoff t={p.tradeoff} />
      </div>
    </div>
  );
}

function reviewsLabel(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;
}

// Stable per-item rating when the model didn't supply one (so each item always
// shows its OWN rating instead of the misleading combo-wide one).
function synthRating(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return { rating: (40 + (h % 9)) / 10, reviews: 800 + (h % 9000) }; // 4.0–4.8, 800–9.8k
}

// Per-item prices: use the model's if given, else split the combo total with a
// stable per-name weight so they differ but still sum to the total.
function bundlePrices(items: BundleItem[], total: number): number[] {
  if (items.every((it) => typeof it.price === "number")) return items.map((it) => it.price as number);
  const w = items.map((it) => 1 + (synthRating(it.name).reviews % 100) / 100);
  const sum = w.reduce((a, b) => a + b, 0);
  return items.map((_, i) => Math.round((total * w[i]) / sum));
}

// Combo pick → each component shown separately (bigger image + title + its OWN price & rating), joined by +.
function BundleHeader({ items, pick, wallet }: { items: BundleItem[]; pick: Product; wallet: Wallet }) {
  const prices = bundlePrices(items, pick.price);
  return (
    <div>
      <div className="flex items-start justify-center gap-3">
        {items.slice(0, 4).map((it, i) => {
          const rating = it.rating ?? synthRating(it.name).rating;
          const reviews = it.reviews ?? synthRating(it.name).reviews;
          return (
            <Fragment key={i}>
              {i > 0 && <span className="pt-14 text-xl text-muted-foreground">+</span>}
              <div className="flex w-32 flex-col items-center text-center">
                <ProductImage query={it.image || it.name} className="size-28 rounded-2xl border border-border" />
                <div className="mt-2 text-xs font-medium leading-tight">{it.name}</div>
                <div className="mt-1 text-sm font-semibold" style={{ color: ORANGE }}>{money(wallet, prices[i])}</div>
                <div className="mt-0.5 flex items-center gap-1 text-[13px] text-muted-foreground">
                  <Star className="size-4 fill-[#FF9900] text-[#FF9900]" />{rating}
                  <span className="text-muted-foreground/70">({reviewsLabel(reviews)})</span>
                </div>
              </div>
            </Fragment>
          );
        })}
      </div>
      {(() => {
        const separate = Math.round(pick.price * 1.12);
        const savings = separate - pick.price;
        return (
          <div className="mt-5 flex items-center justify-between rounded-2xl bg-secondary/40 px-4 py-3">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Combo total · {items.length} items</div>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="text-xl font-semibold" style={{ color: ORANGE }}>{money(wallet, pick.price)}</span>
                <span className="text-sm text-muted-foreground line-through">{money(wallet, separate)}</span>
              </div>
            </div>
            <span className="rounded-full bg-emerald-500/15 px-3 py-1.5 text-sm font-medium text-emerald-300">Save {money(wallet, savings)}</span>
          </div>
        );
      })()}
      <div className="mt-4">
        <WhyList why={pick.why} />
        <Tradeoff t={pick.tradeoff} />
      </div>
    </div>
  );
}

// ── mode 1: Frictionless ─────────────────────────────────────────────────────
function FrictionlessCard({ a, wallet, onPlace, onAddBalance }: {
  a: Extract<Artifact, { kind: "frictionless" }>; wallet: Wallet; onPlace: Place; onAddBalance: (n: number) => void;
}) {
  const budget = computeBudget(a.pick.price, wallet);
  const [reorderOn, setReorderOn] = useState(a.reorder?.suggested ?? true); // auto-selected by default

  // Show the per-item breakdown for ANY combo: prefer the model's rich bundle
  // (with ratings); otherwise synthesize one from the "A + B + C" name so the
  // titled layout still appears (just without per-item ratings).
  const nameParts = a.pick.name.split(/\s*\+\s*/).map((s) => s.trim()).filter(Boolean);
  const bundle: BundleItem[] | null =
    a.bundle && a.bundle.length > 1 ? a.bundle : nameParts.length > 1 ? nameParts.map((name) => ({ name })) : null;

  return (
    <CardShell chip="Frictionless" chipIcon={<Zap className="size-3.5" />} title={a.pick.name} sub={a.title}
      budget={budget} wallet={wallet} onAddBalance={onAddBalance} onBuy={() => onPlace(a.pick.name, a.pick.price, a.pick.image)}>
      {bundle ? (
        <BundleHeader items={bundle} pick={a.pick} wallet={wallet} />
      ) : (
        <PickHeader p={a.pick} wallet={wallet} />
      )}
      {a.reorder?.suggested && (
        <button onClick={() => setReorderOn((v) => !v)}
          className={`mt-4 flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-colors ${reorderOn ? "border-[#FF9900]/50 bg-[#FF9900]/10" : "border-border bg-secondary/30"}`}>
          <span className={`flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors ${reorderOn ? "border-[#FF9900] bg-[#FF9900] text-black" : "border-muted-foreground/50 text-transparent"}`}>
            <Check className="size-3.5" />
          </span>
          <RefreshCw className="size-4 shrink-0 text-[#FF9900]" />
          <span>Auto-reorder <b>{a.reorder.cadence}</b> — never run out.{reorderOn ? "" : " (off)"}</span>
        </button>
      )}
      {a.alternatives?.length > 0 && (
        <div className="mt-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Also considered</div>
          <div className="mt-2 space-y-2">
            {a.alternatives.map((alt, i) => (
              <div key={i} className="flex items-center justify-between gap-3 rounded-xl bg-secondary/30 px-3 py-2 text-sm">
                <span className="font-medium">{alt.name}</span>
                <span className="text-muted-foreground">{money(wallet, alt.price)} · {alt.note}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </CardShell>
  );
}

// ── mode 2: Intent (goal kit) — per-item approval ────────────────────────────
function IntentKit({ a, wallet, onPlace, onAddBalance }: {
  a: Extract<Artifact, { kind: "intent" }>; wallet: Wallet; onPlace: Place; onAddBalance: (n: number) => void;
}) {
  const [on, setOn] = useState<boolean[]>(() => a.items.map(() => true));
  const count = on.filter(Boolean).length;
  const total = a.items.reduce((s, it, i) => (on[i] ? s + (it.price || 0) : s), 0);
  const firstImg = a.items.find((_, i) => on[i])?.image;
  const budget = computeBudget(total, wallet);
  const toggle = (i: number) => setOn((s) => s.map((v, j) => (j === i ? !v : v)));

  return (
    <CardShell chip="Goal Kit" chipIcon={<Target className="size-3.5" />} title={a.goal} sub={a.rationale}
      budget={budget} wallet={wallet} onAddBalance={onAddBalance} disabled={count === 0}
      onBuy={() => onPlace(`${a.goal} · ${count} item${count > 1 ? "s" : ""}`, total, firstImg)}>
      <div className="mb-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>Everything&apos;s selected — tap to remove what you already have.</span>
        <span className="shrink-0">{count} to buy</span>
      </div>
      <div className="space-y-3">
        {a.items.map((it, i) => (
          <div
            key={i}
            onClick={() => toggle(i)}
            role="button"
            aria-pressed={on[i]}
            className={`cursor-pointer rounded-2xl border p-4 transition-all ${on[i] ? "border-[#FF9900]/50 bg-secondary/20" : "border-border/50 bg-secondary/5 opacity-60 hover:opacity-100"}`}
          >
            <div className="flex gap-3">
              <ProductImage query={it.image || it.name} className="size-16 shrink-0 rounded-xl border border-border" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {it.role && <div className="text-xs uppercase tracking-wide text-muted-foreground">{it.role}</div>}
                    <div className="font-medium">{it.name}</div>
                  </div>
                  <span
                    aria-hidden
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors ${on[i] ? "border-[#FF9900] bg-[#FF9900] text-black" : "border-muted-foreground/50 text-transparent"}`}
                  >
                    <Check className="size-3.5" />
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3">
                  <span className="font-medium" style={{ color: ORANGE }}>{money(wallet, it.price)}</span>
                  <Rating p={it} />
                </div>
              </div>
            </div>
            {on[i] && (<><WhyList why={it.why} /><Tradeoff t={it.tradeoff} /></>)}
          </div>
        ))}
      </div>
    </CardShell>
  );
}

// ── mode 3: Emergency ────────────────────────────────────────────────────────
function EmergencyCard({ a, wallet, onPlace, onAddBalance }: {
  a: Extract<Artifact, { kind: "emergency" }>; wallet: Wallet; onPlace: Place; onAddBalance: (n: number) => void;
}) {
  const budget = computeBudget(a.pick.price, wallet);
  return (
    <CardShell chip="Emergency · solve now" chipIcon={<Zap className="size-3.5" />} title={a.pick.name} sub={a.situation}
      budget={budget} wallet={wallet} onAddBalance={onAddBalance} onBuy={() => onPlace(a.pick.name, a.pick.price, a.pick.image)}>
      <div className="mb-3 flex flex-wrap gap-2">
        <span className="flex items-center gap-1.5 rounded-full bg-rose-500/15 px-3 py-1 text-sm text-rose-300">
          <Zap className="size-3.5" /> {a.urgency}
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-secondary/50 px-3 py-1 text-sm text-foreground/90">
          <Truck className="size-3.5" /> {a.delivery}
        </span>
      </div>
      <PickHeader p={a.pick} wallet={wallet} />
    </CardShell>
  );
}

export function ArtifactView({ artifact, wallet, onPlace, onAddBalance }: {
  artifact: Artifact; wallet: Wallet; onPlace: Place; onAddBalance: (amt: number) => void;
}) {
  switch (artifact.kind) {
    case "frictionless": return <FrictionlessCard a={artifact} wallet={wallet} onPlace={onPlace} onAddBalance={onAddBalance} />;
    case "intent": return <IntentKit a={artifact} wallet={wallet} onPlace={onPlace} onAddBalance={onAddBalance} />;
    case "emergency": return <EmergencyCard a={artifact} wallet={wallet} onPlace={onPlace} onAddBalance={onAddBalance} />;
  }
}
