"use client";

import { useEffect, useState } from "react";
import { VerificationFeed, type FeedItem } from "@/components/VerificationFeed";

export function NetworkPreview() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    fetch("/api/verifications")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("feed unavailable")))
      .then((data) => setItems(data.verifications ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoaded(true));
  }, []);
  return loaded && items.length > 0
    ? <VerificationFeed items={items.slice(0, 3)} />
    : <div className="feed-empty"><div className="feed-empty-icon" aria-hidden>◎</div><h3>{loaded ? "The network is ready for its first proof." : "Loading the verification network…"}</h3><p>{loaded ? "Run the demo to inspect a complete verification, or create an agreement for your own agent." : "Fetching the latest verification records."}</p></div>;
}
