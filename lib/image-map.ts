// Maps a product to a bundled photo in /public/products. No external image API.
//
// Primary path: the agent picks an "image" that is an EXACT photo id from the
// catalog it reads out of /public/products (see app/api/agent/route.ts). Such a
// bare slug ("pants", "trekking-shoes") resolves straight to its file below.
//
// Fallback path: for free-text product names (e.g. proactive predictions), we
// keyword-match against the CATEGORIES table.
//
// `ext` defaults to "jpg"; ProductImage auto-retries the other extension on load
// error, so a photo saved as .png still works without listing it here.

const CATEGORIES: { file: string; ext?: string; keys: string[] }[] = [
  // More specific categories first so they win over the generic ones below.
  // Pants before trekking-shoes so "hiking pants" → pants photo, not a boot.
  { file: "pants", keys: ["pant", "trouser", "jogger", "legging", "chino", "cargo", "track pant"] },
  { file: "trekking-shoes", ext: "png", keys: ["trek", "hiking", "hike", "trail", "mountaineer"] },
  { file: "shoes", keys: ["shoe", "sneaker", "running", "footwear", "trainer", "asics", "nike", "kiprun", "cleat"] },
  // Specific staples first, so a combo's items get distinct photos (not one generic grocery shot).
  { file: "rice", keys: ["rice", "basmati", "atta", "flour", "grain"] },
  { file: "dal", keys: ["dal", "toor", "lentil", "pulse", "moong", "chana", "rajma"] },
  { file: "oil", keys: ["oil", "sunflower", "mustard", "ghee", "olive oil"] },
  { file: "salt", keys: ["salt"] },
  { file: "sugar", keys: ["sugar"] },
  { file: "groceries", keys: ["grocery", "groceries", "milk", "vegetable", "spice", "snack", "pantry", "food", "masala", "staple"] },
  { file: "waterbottle", ext: "png", keys: ["water bottle", "waterbottle"] },
  { file: "bottle", keys: ["bottle", "flask", "hydration", "sipper"] },
  { file: "raincoat", keys: ["raincoat", "rainwear", "poncho", "rain jacket"] },
  { file: "umbrella", ext: "png", keys: ["umbrella", "parasol"] },
  { file: "jacket", keys: ["jacket", "coat", "hoodie", "sweater", "fleece", "windcheater", "pullover"] },
  { file: "tshirt", keys: ["tshirt", "t-shirt", "shirt", "tee", "jersey", "apparel", "clothing"] },
  { file: "plumbing", keys: ["plumb", "pipe", "seal", "tape", "leak", "faucet", "tap", "wrench", "valve", "gasket", "sink"] },
  { file: "fishing", keys: ["fishing", "tackle", "rod", "reel", "bait", "angler", "lure"] },
  { file: "watch", keys: ["watch", "garmin", "tracker", "fitbit", "smartwatch", "band"] },
  { file: "camera", keys: ["camera", "dslr", "lens", "gopro", "mirrorless"] },
  { file: "powerbank", keys: ["power bank", "powerbank", "power-bank"] },
  { file: "charger", keys: ["charger", "charging", "cable", "usb", "type-c", "adaptor"] },
  { file: "adapter", keys: ["travel adapter", "plug", "universal adapter", "converter"] },
  { file: "battery", keys: ["battery", "batteries", "aaa", "aa", "cell"] },
  { file: "headphones", keys: ["headphone", "earphone", "earbud", "airpod", "headset", "neckband"] },
  { file: "sunglasses", keys: ["sunglass", "shades", "eyewear", "goggles"] },
  { file: "body-lotion", keys: ["body lotion", "moisturizer", "moisturiser", "body cream", "body butter"] },
  { file: "sunscreen", keys: ["sunscreen", "spf", "sunblock"] },
  { file: "towel", keys: ["towel"] },
  { file: "perfume", keys: ["perfume", "cologne", "fragrance", "deodorant", "deo"] },
  { file: "backpack", keys: ["backpack", "rucksack", "daypack"] },
  { file: "bag", keys: ["bag", "tote", "luggage", "suitcase", "duffel", "pouch"] },
  { file: "gardening", keys: ["garden", "gardening", "pruning", "prune", "weeding", "trowel", "secateur", "lawn", "planting", "shovel", "spade", "rake", "horticulture"] },
  { file: "kitchen", keys: ["kitchen", "utensil", "cookware", "pan", "knife", "spatula"] },
  { file: "book", keys: ["book", "novel", "kindle", "paperback", "diary", "journal"] },
  { file: "toy", keys: ["toy", "lego", "puzzle", "game"] },
  { file: "gift", keys: ["gift", "present", "hamper"] },
];

export function localImageFor(query: string): string {
  const q = query.toLowerCase().trim();

  // Primary: the agent gives an exact photo id (a bare slug). Resolve it straight
  // to the file — ProductImage handles .jpg/.png and the missing-file fallback.
  if (/^[a-z0-9-]+$/.test(q)) return `/products/${q}.jpg`;

  // Fallback: free-text product name → best keyword match.
  for (const c of CATEGORIES) {
    if (c.keys.some((k) => q.includes(k))) return `/products/${c.file}.${c.ext ?? "jpg"}`;
  }
  // Nothing matched — generic gift photo so we never show a blank tile.
  return "/products/gift.jpg";
}
