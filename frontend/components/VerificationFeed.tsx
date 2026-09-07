"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { VerificationSummary } from "@/lib/types";
import { VerificationCard } from "@/components/VerificationCard";

export type FeedItem = VerificationSummary & {
  description?: string;
  evidenceCount?: number;
};

type Filter = "all" | "verified" | "failed" | "pending" | "recent";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "verified", label: "Verified" },
  { key: "failed", label: "Failed" },
  { key: "pending", label: "Pending" },
  { key: "recent", label: "Recent" },
];

export function VerificationFeed({ items, compact = false }: { items: FeedItem[]; compact?: boolean }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [now] = useState(() => Date.now());
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return [...items]
      .filter((item) => {
        if (filter === "verified") return item.status === "PASSED";
        if (filter === "failed") return item.status === "FAILED";
        if (filter === "pending") return ["OPEN", "SUBMITTED", "VERIFYING"].includes(item.status);
        return true;
      })
      .filter((item) => filter !== "recent" || now - new Date(item.createdAt).getTime() < 24 * 60 * 60 * 1000)
      .filter((item) => {
        if (!normalized) return true;
        return [item.title, item.description, item.creator, item.agent, item.id]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalized));
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [filter, items, now, query]);

  return <div className="feed-panel">
    {!compact && <div className="feed-toolbar"><label className="search-field"><span aria-hidden>⌕</span><span className="sr-only">Search verifications</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search verifications…" /></label><div className="feed-filters" role="tablist" aria-label="Verification filters">{FILTERS.map((item) => <button key={item.key} type="button" role="tab" aria-selected={filter === item.key} className={filter === item.key ? "feed-filter feed-filter-active" : "feed-filter"} onClick={() => setFilter(item.key)}>{item.label}</button>)}</div></div>}
    {filtered.length > 0 ? <div className="feed-list">{filtered.map((item) => <VerificationCard key={item.id} v={item} />)}</div> : <div className="feed-empty"><div className="feed-empty-icon" aria-hidden>◎</div><h3>{items.length === 0 ? "The network is ready for its first proof." : "No verifications match this view."}</h3><p>{items.length === 0 ? "Run the live demo to inspect a complete verification, or create an agreement for your own agent." : "Try another filter or search term."}</p>{items.length === 0 && <div className="flex flex-wrap justify-center gap-2"><Link href="/demo" className="btn-primary">Explore live demo</Link><Link href="/create" className="btn-secondary">Create verification</Link></div>}</div>}
  </div>;
}
