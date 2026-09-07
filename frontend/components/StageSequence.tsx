"use client";

import { useEffect, useRef, useState } from "react";
import type { VerificationResult } from "@/lib/types";

const STAGES = [
  { key: "evidence", title: "Evidence received", detail: "Deliverable and supporting material secured" },
  { key: "deterministic", title: "Deterministic checks", detail: "Files, functions, strings, and test outcomes" },
  { key: "validators", title: "GenLayer validators", detail: "Independent Intelligent Contract evaluation" },
  { key: "consensus", title: "Consensus", detail: "Stable PASS / FAIL decisions converge" },
  { key: "final", title: "Final decision", detail: "Proof record finalized" },
];

export function StageSequence({ running, result, mode, onDone }: { running: boolean; result: VerificationResult | null; mode: "demo" | "genlayer"; onDone: () => void }) {
  const [active, setActive] = useState(0); const doneRef = useRef(false); const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);
  useEffect(() => { if (!running) return; doneRef.current = false; const reset = setTimeout(() => setActive(0), 0); const timers = STAGES.map((_, i) => setTimeout(() => { setActive(i + 1); if (i === STAGES.length - 1 && !doneRef.current) { doneRef.current = true; setTimeout(() => onDoneRef.current(), 450); } }, 450 + i * 800)); return () => { clearTimeout(reset); timers.forEach(clearTimeout); }; }, [running]);
  const complete = active >= STAGES.length && result !== null;
  return <div className="card p-5 md:p-6"><div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="eyebrow">Verification status</p><h2 className="mt-2 text-xl font-bold">{complete ? "Decision ready" : "GenLayer is checking the work"}</h2></div><span className={`status-badge ${mode === "genlayer" ? "status-live" : "status-neutral"}`}>{mode === "genlayer" ? "LIVE · ON-CHAIN" : "DEMO · SIMULATED"}</span></div><div className="mb-5 h-1.5 overflow-hidden rounded-full bg-[var(--surface-muted)]"><div className="h-full rounded-full bg-[var(--orange)] transition-all duration-700" style={{ width: `${Math.min((active / STAGES.length) * 100, 100)}%` }} /></div><ol className="space-y-2">{STAGES.map((s, i) => { const done = active > i || complete; const current = active === i && running; return <li key={s.key} className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${done ? "border-[#a9d7bd] bg-[var(--green-soft)]" : current ? "border-[#f4b39b] bg-[var(--orange-soft)]" : "border-[var(--border)] bg-[var(--surface-muted)] opacity-60"}`}><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full font-mono text-xs font-bold ${done ? "bg-[var(--green)] text-white" : current ? "bg-[var(--orange)] text-white" : "bg-white text-[var(--soft-muted)]"}`}>{done ? "✓" : String(i + 1).padStart(2, "0")}</span><span className="min-w-0 flex-1"><strong className="block text-sm">{s.title}</strong><span className="block truncate text-xs text-[var(--muted)]">{s.detail}</span></span>{current && <span className="pulse-glow text-xs font-semibold text-[var(--orange-dark)]">Working…</span>}</li>; })}</ol></div>;
}
