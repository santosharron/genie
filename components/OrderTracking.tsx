"use client";

import { useEffect, useState } from "react";
import { Truck, Mail, MessageSquare, ExternalLink, CheckCircle2, Package } from "lucide-react";
import type { Order } from "@/lib/orders";
import { ProductImage } from "@/components/ProductImage";

// iOS Live-Activity-style delivery tracker (modelled on the flight live-activity:
// origin → destination, a moving vehicle on a progress bar, ETA + "on time").
export function OrderTracking({ order, currency }: { order: Order; currency: string }) {
  const [pct, setPct] = useState(8);
  useEffect(() => {
    setPct(8);
    const t = setInterval(() => setPct((p) => (p < 62 ? p + 2 : p)), 110);
    return () => clearInterval(t);
  }, [order.id]);

  return (
    <div className="space-y-4">
      {/* the live-activity card */}
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#0f1722] to-[#0b0f16] p-5 shadow-2xl shadow-black/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-white/90">
            <Truck className="size-4 text-[#FF9900]" />
            Order {order.id}
          </div>
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300">On the way</span>
        </div>

        {/* origin → destination */}
        <div className="mt-4 flex items-center justify-between">
          <div>
            <div className="font-mono text-lg font-semibold text-[#FF9900]">{order.fromTime}</div>
            <div className="text-xs uppercase tracking-wide text-white/40">{order.fromLabel}</div>
          </div>
          <div className="flex-1 px-3">
            <div className="relative h-1.5 rounded-full bg-white/10">
              <div className="absolute inset-y-0 left-0 rounded-full bg-[#FF9900] transition-all duration-200" style={{ width: `${pct}%` }} />
              <Truck
                className="absolute top-1/2 size-4 -translate-y-1/2 text-[#FF9900] transition-all duration-200"
                style={{ left: `calc(${pct}% - 8px)` }}
              />
            </div>
            <div className="mt-1.5 text-center text-[11px] text-white/40">{order.etaLabel}</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-lg font-semibold text-white/90">{order.toTime}</div>
            <div className="text-xs uppercase tracking-wide text-white/40">{order.toLabel}</div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-emerald-300">
          <CheckCircle2 className="size-3.5" /> On time · arrives {order.etaLabel}
        </div>
      </div>

      {/* what was ordered */}
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
        <ProductImage query={order.image || order.title} className="size-14 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{order.title}</div>
          <div className="text-sm text-muted-foreground">{currency}{order.total.toLocaleString("en-IN")} · paid</div>
        </div>
        <Package className="size-5 text-muted-foreground" />
      </div>

      {/* the agent's follow-through */}
      <div className="space-y-2 rounded-2xl border border-border bg-secondary/30 p-4">
        <div className="flex items-center gap-2 text-sm">
          <Mail className="size-4 text-emerald-400" />
          <span>Confirmation email sent</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <MessageSquare className="size-4 text-[#FF9900]" />
          <span>I&apos;ll text you a day before delivery</span>
        </div>
        <a
          href={order.trackingUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[#FF9900] px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
        >
          Track order <ExternalLink className="size-3.5" />
        </a>
      </div>
    </div>
  );
}
