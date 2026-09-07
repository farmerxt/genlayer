"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEMO_SCENARIO_META } from "@/lib/demo/scenario-meta";
import { ModeBadge } from "@/components/StatusBadge";

export function DemoPicker() {
  const router = useRouter(); const [loading, setLoading] = useState<string | null>(null); const [error, setError] = useState<string | null>(null);
  async function loadScenario(id: string) { setLoading(id); setError(null); try { const res = await fetch("/api/demo/load", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenarioId: id }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error ?? "Failed to load demo"); router.push(`/verify/${data.verification.id}?demo=1`); } catch (err) { setError(err instanceof Error ? err.message : "Failed to load demo"); setLoading(null); } }
  return <div className="space-y-3"><div className="mb-4 flex items-center justify-between"><div><p className="eyebrow">Choose a scenario</p><h2 className="mt-2 text-xl font-bold">Run the real verification logic</h2></div><ModeBadge mode="demo" /></div>{DEMO_SCENARIO_META.map((s) => <div key={s.id} className="card card-hover flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{s.label}</h3><span className={`status-badge ${s.expected === "PASS" ? "status-success" : "status-danger"}`}>EXPECTED {s.expected}</span></div><p className="mt-1 text-sm text-[var(--muted)]">{s.tagline}</p></div><button type="button" onClick={() => loadScenario(s.id)} disabled={loading !== null} className="btn-primary shrink-0 !py-2.5 text-xs">{loading === s.id ? "Loading…" : "Run scenario →"}</button></div>)}{error && <p role="alert" className="rounded-lg border border-[#efb8b0] bg-[var(--red-soft)] px-4 py-3 text-sm text-[var(--red)]">{error}</p>}</div>;
}
