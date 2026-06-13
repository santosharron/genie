"use client";

import { useEffect, useState } from "react";
import { Package } from "lucide-react";
import { localImageFor } from "@/lib/image-map";

// Try the other extension before giving up, so a category photo works whether it
// was saved as .jpg or .png (image-map only declares one).
function swapExt(path: string): string | null {
  if (path.endsWith(".jpg")) return path.slice(0, -4) + ".png";
  if (path.endsWith(".png")) return path.slice(0, -4) + ".jpg";
  return null;
}

// Product images come straight from the photos bundled in /public/products —
// localImageFor maps the product name to the best-matching category photo.
// No external image API. If an image somehow fails to load, show a clean icon tile.
export function ProductImage({ query, className = "" }: { query: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(localImageFor(query));
  const [triedSwap, setTriedSwap] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSrc(localImageFor(query));
    setTriedSwap(false);
    setFailed(false);
  }, [query]);

  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-secondary to-card ${className}`}>
        <Package className="size-6 text-muted-foreground" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={query}
      loading="lazy"
      onError={() => {
        const alt = !triedSwap && src ? swapExt(src) : null;
        if (alt) { setTriedSwap(true); setSrc(alt); } // .jpg missing → try .png (or vice-versa)
        else setFailed(true); // neither exists → clean icon tile
      }}
      className={`object-cover ${className}`}
    />
  );
}
