// A placed order — drives the live-tracking card and the activity log. Mock data
// for the demo; in production this comes from the Amazon order/fulfilment APIs.

export interface Order {
  id: string;
  title: string;
  total: number;
  image?: string;
  placedAt: number;
  fromLabel: string; // "Warehouse"
  toLabel: string; // "Your door"
  fromTime: string; // "7:43 AM"
  toTime: string; // "9:23 AM"
  etaLabel: string; // "Tomorrow, 9:23 AM"
  trackingUrl: string;
}

export function makeOrder(title: string, total: number, image?: string): Order {
  const id = "AMZ" + Math.random().toString(36).slice(2, 7).toUpperCase();
  return {
    id,
    title,
    total,
    image,
    placedAt: Date.now(),
    fromLabel: "Warehouse",
    toLabel: "Your door",
    fromTime: "7:43 AM",
    toTime: "9:23 AM",
    etaLabel: "Tomorrow, 9:23 AM",
    trackingUrl: `https://track.amazon.in/${id}`,
  };
}
