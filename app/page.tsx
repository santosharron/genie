"use client";

import { useEffect, useRef, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { ArrowUp, Loader2, Check, Gift, Target, Zap, ShoppingCart, ScrollText, X, Package, ChevronRight, Sparkles } from "lucide-react";
import type { Artifact } from "@/lib/artifacts";
import { artifactTotal } from "@/lib/artifacts";
import { type Wallet, DEFAULT_WALLET, remaining } from "@/lib/wallet";
import { type Order, makeOrder } from "@/lib/orders";
import { type PredictedNeed, localPredictions } from "@/lib/predict";
import { ArtifactView } from "@/components/artifacts/ArtifactView";
import { OrderTracking } from "@/components/OrderTracking";
import { ProductImage } from "@/components/ProductImage";
import { AgentWorking } from "@/components/AgentWorking";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  steps?: string[];
  artifact?: Artifact; // an assistant turn that produced a recommendation
  order?: Order; // an assistant turn that placed an order
}
interface LogEntry { id: string; kind: "recommendation" | "order"; label: string; sub?: string; image?: string; at: number; }

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const uid = () => Math.random().toString(36).slice(2, 9);

const EXAMPLES = [
  { icon: ShoppingCart, label: "Refill my monthly groceries", text: "Refill my usual monthly groceries" },
  { icon: Target, label: "I want to run 650 km", text: "I want to start running and hit 650 km — what do I actually need?" },
  { icon: Zap, label: "My sink is leaking right now", text: "My kitchen sink pipe is leaking right now, water everywhere, help" },
  { icon: Gift, label: "Gift for dad's 60th", text: "Gift for my dad's 60th birthday, he loves fishing, hates gadgets, budget 3000" },
];

export default function Home() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [openId, setOpenId] = useState(""); // which turn's artifact/order is shown on the right
  const [wallet, setWallet] = useState<Wallet>(DEFAULT_WALLET);
  const [orders, setOrders] = useState<Order[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [limitOpen, setLimitOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [liveSteps, setLiveSteps] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<PredictedNeed[]>(() => localPredictions(DEFAULT_WALLET));

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, liveSteps, loading]);

  // Proactively predict what the user will need (model-backed, local fallback).
  useEffect(() => {
    let cancelled = false;
    fetch("/api/predict", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wallet: DEFAULT_WALLET }) })
      .then((r) => r.json())
      .then((d) => { if (!cancelled && Array.isArray(d?.predictions) && d.predictions.length) setPredictions(d.predictions); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Open a past artifact/order from its inline card.
  function openRef(m: ChatMsg) {
    if (m.order) { setActiveOrder(m.order); setOpenId(m.id); }
    else if (m.artifact) { setActiveOrder(null); setArtifact(m.artifact); setOpenId(m.id); }
  }

  async function send(text: string) {
    const t = text.trim();
    if (!t || loading) return;
    const next = [...messages, { id: uid(), role: "user", content: t } as ChatMsg];
    setMessages(next);
    setInput("");
    setError(null);
    setLoading(true);
    setLiveSteps([]);
    setActiveOrder(null);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map((m) => ({ role: m.role, content: m.content })), artifact, wallet }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);

      const steps: string[] = data.thinking_steps || [];
      for (let i = 0; i < steps.length; i++) {
        setLiveSteps(steps.slice(0, i + 1));
        await sleep(750); // deliberate, one-by-one — sells the "heavy work" on the right
      }
      await sleep(350);

      const aid = uid();
      const a: Artifact | undefined = data.artifact ? (data.artifact as Artifact) : undefined;
      setMessages((m) => [...m, { id: aid, role: "assistant", content: data.reply, steps, artifact: a }]);
      if (a) {
        setArtifact(a);
        setActiveOrder(null);
        setOpenId(aid);
        const label = a.kind === "intent" ? a.goal : a.pick.name;
        const image = a.kind === "intent" ? a.items[0]?.image || a.items[0]?.name : a.pick.image || a.pick.name;
        setLog((l) => [{ id: uid(), kind: "recommendation", label, sub: `${a.kind} · ${wallet.currency}${artifactTotal(a).toLocaleString("en-IN")}`, image, at: Date.now() }, ...l]);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setLiveSteps([]);
    }
  }

  async function placeOrder(title: string, total: number, image?: string) {
    if (total <= 0 || total > remaining(wallet)) return;
    const order = makeOrder(title, total, image);
    const after = remaining(wallet) - total;
    const doneId = uid();

    setOrders((o) => [order, ...o]);
    setActiveOrder(order);
    setOpenId(doneId);
    setWallet((w) => ({ ...w, spentThisMonth: w.spentThisMonth + total }));
    setLog((l) => [{ id: uid(), kind: "order", label: title, sub: `Order ${order.id} · ${wallet.currency}${total.toLocaleString("en-IN")}`, image, at: Date.now() }, ...l]);

    setMessages((m) => [...m, { id: doneId, role: "assistant", content: `✅ Done — I placed your order (${order.id}). ${wallet.currency}${after.toLocaleString("en-IN")} left this month.`, order }]);
    await sleep(700);
    setMessages((m) => [...m, { id: uid(), role: "assistant", content: `📧 Confirmation email sent · 📱 I'll text you a day before it arrives (${order.etaLabel}).` }]);
    await sleep(700);
    setMessages((m) => [...m, { id: uid(), role: "assistant", content: `I'm tracking it for you — live link: ${order.trackingUrl}` }]);
  }

  function onAddBalance(amount: number) {
    if (amount <= 0) return;
    setWallet((w) => ({ ...w, monthlyBudget: w.monthlyBudget + amount }));
    setMessages((m) => [...m, { id: uid(), role: "assistant", content: `💳 Added ${wallet.currency}${amount.toLocaleString("en-IN")} to your wallet. You're set — just confirm and I'll place it.` }]);
  }

  function onSetLimit(v: number) {
    setWallet((w) => ({ ...w, monthlyBudget: v }));
  }

  const started = messages.length > 0;

  return (
    <main className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between gap-3 px-6 py-4">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Logo.svg" alt="amazon" className="h-6 w-auto" />
          <span className="font-sans text-lg font-medium tracking-tight text-foreground/90">Genie</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowLog(true)}
            className="relative flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground/90 transition-colors hover:bg-secondary">
            <ScrollText className="size-3.5" /> Activity
            {log.length > 0 && <span className="ml-0.5 rounded-full bg-[#FF9900] px-1.5 text-[10px] font-semibold text-black">{log.length}</span>}
          </button>
          <WalletPill wallet={wallet} onClick={() => setLimitOpen(true)} />
        </div>
      </header>

      {!started ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 pb-24">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Logo.svg" alt="amazon" className="mb-6 h-9 w-auto" />
          <h1 className="text-center font-serif text-4xl font-medium tracking-tight sm:text-5xl">What do you need?</h1>
          <p className="mt-3 max-w-md text-center text-[15px] text-muted-foreground">
            Just text me like a friend. I&apos;ll figure out the rest — within your budget.
          </p>
          <div className="mt-8 w-full max-w-2xl">
            <Composer value={input} onChange={setInput} onSend={() => send(input)} loading={loading} big />
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {EXAMPLES.map(({ icon: Icon, label, text }) => (
                <button key={label} onClick={() => send(text)}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-3.5 py-2 text-sm text-foreground/90 transition-colors hover:border-[#FF9900]/40 hover:bg-secondary">
                  <Icon className="size-4 text-[#FF9900]" />
                  {label}
                </button>
              ))}
            </div>
            <PredictedNeeds items={predictions} onPick={(q) => send(q)} />
            {error && <ErrorLine error={error} />}
          </div>
        </div>
      ) : (
        <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-2">
          <section className="flex flex-col overflow-hidden border-border lg:border-r">
            <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
              {messages.map((m) =>
                m.role === "user" ? (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-md bg-secondary px-4 py-2.5 text-[15px]">{m.content}</div>
                  </div>
                ) : (
                  <AssistantTurn key={m.id} m={m} active={m.id === openId} currency={wallet.currency} onOpen={() => openRef(m)} />
                )
              )}
              {loading && <WorkingTurn steps={liveSteps} />}
              {error && <ErrorLine error={error} />}
            </div>
            <div className="border-t border-border p-4">
              <Composer value={input} onChange={setInput} onSend={() => send(input)} loading={loading} />
            </div>
          </section>

          <section className="hidden overflow-y-auto bg-background/40 p-6 lg:block">
            {loading ? (
              <AgentWorking steps={liveSteps} />
            ) : activeOrder ? (
              <OrderTracking order={activeOrder} currency={wallet.currency} />
            ) : artifact ? (
              <ArtifactView key={openId} artifact={artifact} wallet={wallet} onPlace={placeOrder} onAddBalance={onAddBalance} />
            ) : (
              <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                Your result will appear here.
              </div>
            )}
          </section>
        </div>
      )}

      {showLog && <ActivityDrawer log={log} onClose={() => setShowLog(false)} />}
      <LimitDialog open={limitOpen} onOpenChange={setLimitOpen} wallet={wallet} onSetLimit={onSetLimit} />
    </main>
  );
}

// ── pieces ───────────────────────────────────────────────────────────────────
function Composer({ value, onChange, onSend, loading, big }: {
  value: string; onChange: (v: string) => void; onSend: () => void; loading: boolean; big?: boolean;
}) {
  const has = value.trim().length > 0;
  return (
    <div className="rounded-[28px] border border-border bg-card shadow-xl shadow-black/20 transition-colors focus-within:border-[#FF9900]/50">
      <TextareaAutosize
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
        placeholder={big ? "e.g. I want to run 650 km…" : "Reply to Genie…"}
        minRows={big ? 2 : 1}
        maxRows={8}
        className="w-full resize-none bg-transparent px-5 pt-4 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground"
      />
      <div className="flex items-center justify-between px-3 pb-3 pt-1">
        <span className="ml-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">🧞 Genie</span>
        <button onClick={onSend} disabled={!has || loading} aria-label="Send"
          className="flex size-9 items-center justify-center rounded-full bg-[#FF9900] text-black transition-opacity hover:opacity-90 disabled:opacity-40">
          {loading ? <Loader2 className="size-5 animate-spin" /> : <ArrowUp className="size-5" />}
        </button>
      </div>
    </div>
  );
}

function StepRow({ text, done }: { text: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
      {done ? <Check className="size-3.5 text-emerald-400" /> : <Loader2 className="size-3.5 animate-spin text-[#FF9900]" />}
      <span>{text}</span>
    </div>
  );
}

function WorkingTurn({ steps }: { steps: string[] }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground/90">
        <span className="text-[#FF9900]">🧞 Genie</span> is working…
      </div>
      {steps.map((s, i) => <StepRow key={i} text={s} done={i < steps.length - 1} />)}
      {steps.length === 0 && <StepRow text="Reading your message…" done={false} />}
    </div>
  );
}

// Inline reference card for a past artifact / order — click to reopen it on the right.
function refMeta(m: ChatMsg) {
  if (m.order) return { isOrder: true, label: "Order placed", title: m.order.title, total: m.order.total, image: m.order.image || m.order.title };
  const a = m.artifact!;
  const label = a.kind === "intent" ? "Goal Kit" : a.kind === "emergency" ? "Emergency" : "Recommendation";
  const title = a.kind === "intent" ? a.goal : a.pick.name;
  const image = a.kind === "intent" ? a.items[0]?.image || a.items[0]?.name : a.pick.image || a.pick.name;
  return { isOrder: false, label, title, total: artifactTotal(a), image };
}

function ArtifactRefCard({ m, active, currency, onOpen }: { m: ChatMsg; active: boolean; currency: string; onOpen: () => void }) {
  const meta = refMeta(m);
  return (
    <button onClick={onOpen}
      className={`mt-1 flex w-full max-w-[92%] items-center gap-3 rounded-2xl border p-2.5 text-left transition-colors ${active ? "border-[#FF9900] bg-[#FF9900]/10" : "border-border bg-card hover:bg-secondary"}`}>
      <ProductImage query={meta.image} className="size-11 shrink-0 rounded-xl border border-border" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide" style={{ color: meta.isOrder ? "#34d399" : "#FF9900" }}>
          {meta.isOrder ? <Package className="size-3" /> : <Target className="size-3" />}
          {meta.label}
        </div>
        <div className="truncate text-sm font-medium">{meta.title}</div>
        <div className="text-xs text-muted-foreground">{currency}{meta.total.toLocaleString("en-IN")} · {active ? "Showing" : meta.isOrder ? "View tracking" : "View"}</div>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

function AssistantTurn({ m, active, currency, onOpen }: { m: ChatMsg; active: boolean; currency: string; onOpen: () => void }) {
  return (
    <div className="space-y-2">
      {m.steps && m.steps.length > 0 && (
        <div className="space-y-1">{m.steps.map((s, i) => <StepRow key={i} text={s} done />)}</div>
      )}
      <div className="max-w-[90%] whitespace-pre-wrap text-[15px] leading-relaxed">{m.content}</div>
      {(m.artifact || m.order) && <ArtifactRefCard m={m} active={active} currency={currency} onOpen={onOpen} />}
    </div>
  );
}

function PredictedNeeds({ items, onPick }: { items: PredictedNeed[]; onPick: (q: string) => void }) {
  if (!items.length) return null;
  const tone = (u?: string) => (u === "due" ? "bg-rose-500/15 text-rose-300" : u === "soon" ? "bg-[#FF9900]/15 text-[#FF9900]" : "bg-secondary text-muted-foreground");
  return (
    <div className="mt-8">
      <div className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Sparkles className="size-4 text-[#FF9900]" /> Genie predicts you&apos;ll need
      </div>
      <div className="space-y-2">
        {items.map((p, i) => (
          <button key={i} onClick={() => onPick(p.query)}
            className={`flex w-full items-center gap-3 rounded-2xl border bg-card p-3 text-left transition-colors hover:bg-secondary ${p.kind === "gift" ? "border-[#FF9900]/40" : "border-border hover:border-[#FF9900]/40"}`}>
            <ProductImage query={p.image || p.title} className="size-11 shrink-0 rounded-xl border border-border" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                {p.kind === "gift" && <Gift className="size-3.5 shrink-0 text-[#FF9900]" />}
                <span className="truncate text-sm font-medium">{p.title}</span>
                {p.urgency && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${tone(p.urgency)}`}>{p.urgency}</span>}
              </div>
              <div className="truncate text-xs text-muted-foreground">{p.reason}</div>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}

function WalletPill({ wallet, onClick }: { wallet: Wallet; onClick: () => void }) {
  const left = remaining(wallet);
  const pct = Math.max(2, Math.min(100, (left / wallet.monthlyBudget) * 100));
  return (
    <button onClick={onClick} className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 transition-colors hover:border-[#FF9900]/40 hover:bg-secondary">
      <div className="text-xs text-muted-foreground">This month</div>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "#FF9900" }} />
      </div>
      <div className="text-xs font-medium">{wallet.currency}{left.toLocaleString("en-IN")} left</div>
    </button>
  );
}

function LimitDialog({ open, onOpenChange, wallet, onSetLimit }: {
  open: boolean; onOpenChange: (v: boolean) => void; wallet: Wallet; onSetLimit: (v: number) => void;
}) {
  const left = remaining(wallet);
  const pct = Math.max(2, Math.min(100, (wallet.spentThisMonth / wallet.monthlyBudget) * 100));
  const sliderMax = Math.max(50000, Math.ceil(wallet.monthlyBudget / 1000) * 1000);
  const inr = (n: number) => `${wallet.currency}${n.toLocaleString("en-IN")}`;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-6">
        <DialogTitle className="font-serif text-2xl font-medium">Spending limit</DialogTitle>
        <p className="mt-1 text-sm text-muted-foreground">Genie keeps every purchase under this and is aware of it in real time.</p>

        <div className="mt-5 flex items-baseline justify-between">
          <span className="font-serif text-3xl font-medium">{inr(wallet.monthlyBudget)}</span>
          <span className="text-sm text-muted-foreground">/ month</span>
        </div>

        <Slider aria-label="Spending limit" className="mt-4 [&>:last-child>span]:rounded"
          value={[wallet.monthlyBudget]} min={1000} max={sliderMax} step={1000} onValueChange={(v) => onSetLimit(v[0])} />
        <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
          <span>{inr(1000)}</span><span>{inr(sliderMax)}</span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-secondary/40 p-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Spent</div>
            <div className="mt-0.5 font-medium">{inr(wallet.spentThisMonth)}</div>
          </div>
          <div className="rounded-2xl bg-secondary/40 p-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Remaining</div>
            <div className="mt-0.5 font-medium text-[#FF9900]">{inr(left)}</div>
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "#FF9900" }} />
        </div>

        <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
          Need more room for a specific buy? When a pick goes over this limit, Genie offers to raise it right there — no need to do it here.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function ActivityDrawer({ log, onClose }: { log: LogEntry[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative h-full w-full max-w-sm overflow-y-auto border-l border-border bg-background p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-xl font-medium">Activity</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary">
            <X className="size-5" />
          </button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Everything Genie did for you this session.</p>
        <div className="mt-5 space-y-3">
          {log.length === 0 && <div className="text-sm text-muted-foreground">No activity yet.</div>}
          {log.map((e) => (
            <div key={e.id} className="flex gap-3 rounded-2xl border border-border bg-card p-3">
              <ProductImage query={e.image || e.label} className="size-12 shrink-0 rounded-xl border border-border" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {e.kind === "order" ? <Package className="size-3.5 text-emerald-400" /> : <Target className="size-3.5 text-[#FF9900]" />}
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{e.kind === "order" ? "Order placed" : "Recommendation"}</span>
                </div>
                <div className="truncate font-medium">{e.label}</div>
                {e.sub && <div className="truncate text-sm text-muted-foreground">{e.sub}</div>}
              </div>
              <div className="shrink-0 text-[11px] text-muted-foreground">
                {new Date(e.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ErrorLine({ error }: { error: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-foreground">{error}</div>
  );
}
