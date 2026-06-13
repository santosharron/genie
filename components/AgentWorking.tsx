"use client";

import { type LucideIcon, Globe, Star, Loader2, Wallet, ShieldCheck, Search, MapPin, CloudRain } from "lucide-react";

// A "research console" shown on the right while Genie works. It reacts to the
// CURRENT thinking step — faux browser chrome, shimmering result rows, and (for
// review steps) stars filling in — so it looks like the agent is genuinely
// browsing and reading reviews. Purely theatrical, but sells the heavy lifting.

type Mode = "maps" | "weather" | "reviews" | "browse" | "budget" | "verify";

function modeOf(step: string): Mode {
  const s = step.toLowerCase();
  if (/google maps|\bmaps\b|place review|local review|travel tip/.test(s)) return "maps";
  if (/weather|climate|season|temperatur|monsoon|°c|\d+c\b|degree|hill station|rain/.test(s)) return "weather";
  if (/review|rating|star|read|comment/.test(s)) return "reviews";
  if (/budget|wallet|price|spend|cap|afford|cost/.test(s)) return "budget";
  if (/durab|spec|verif|compar|check|ensur|fit|last|quality/.test(s)) return "verify";
  return "browse";
}

const META: Record<Mode, { url: string; caption: string; Icon: LucideIcon }> = {
  maps: { url: "maps.google › place reviews", caption: "Reading Google Maps reviews", Icon: MapPin },
  weather: { url: "weather › destination forecast", caption: "Checking the local climate", Icon: CloudRain },
  reviews: { url: "amazon.in › reviews", caption: "Reading customer reviews", Icon: Star },
  browse: { url: "amazon.in › searching", caption: "Browsing top products", Icon: Search },
  budget: { url: "pay.amazon.in › budget", caption: "Checking your budget", Icon: Wallet },
  verify: { url: "amazon.in › specs", caption: "Verifying durability & specs", Icon: ShieldCheck },
};

export function AgentWorking({ steps }: { steps: string[] }) {
  const current = steps[steps.length - 1] || "Searching for the best options…";
  const mode = modeOf(current);
  const meta = META[mode];
  const Icon = meta.Icon;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-2xl shadow-black/30">
        {/* faux browser chrome */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <span className="flex gap-1.5">
            {["#ef4444", "#eab308", "#22c55e"].map((c) => (
              <span key={c} className="size-2.5 rounded-full" style={{ background: c, opacity: 0.7 }} />
            ))}
          </span>
          <span className="ml-2 flex flex-1 items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
            <Globe className="size-3.5 animate-spin text-[#FF9900]" style={{ animationDuration: "2.5s" }} />
            {meta.url}
          </span>
        </div>

        {/* current activity */}
        <div className="flex items-center gap-2 px-5 pt-4 text-sm font-medium">
          <Loader2 className="size-4 animate-spin text-[#FF9900]" />
          {current}
        </div>

        {/* shimmering results / reviews */}
        <div className="space-y-3 p-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="size-12 shrink-0 animate-pulse rounded-xl bg-secondary" style={{ animationDelay: `${i * 160}ms` }} />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 w-1/3 animate-pulse rounded bg-secondary" style={{ animationDelay: `${i * 160}ms` }} />
                {mode === "reviews" ? (
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, k) => (
                      <Star key={k} className={`size-3 animate-pulse ${k < 4 ? "fill-[#FF9900] text-[#FF9900]" : "text-muted-foreground/40"}`} style={{ animationDelay: `${k * 120}ms` }} />
                    ))}
                  </div>
                ) : (
                  <div className="h-2.5 w-2/3 animate-pulse rounded bg-secondary" style={{ animationDelay: `${i * 160}ms` }} />
                )}
                <div className="h-2.5 w-5/6 animate-pulse rounded bg-secondary" style={{ animationDelay: `${i * 160}ms` }} />
              </div>
            </div>
          ))}
        </div>

        {/* progress caption — changes with the step */}
        <div className="flex items-center gap-2 border-t border-border px-5 py-3 text-xs text-muted-foreground">
          <Icon className="size-3.5 text-[#FF9900]" />
          {steps.length > 0 ? `Step ${steps.length} · ${meta.caption}` : meta.caption}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin text-[#FF9900]" /> Genie is assembling your result…
      </div>
    </div>
  );
}
