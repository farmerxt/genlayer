"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Verification, VerificationResult } from "@/lib/types";
import { StageSequence } from "@/components/StageSequence";
import { ResultPanel } from "@/components/ResultPanel";
import { AgentSimulator } from "@/components/AgentSimulator";

async function pollFinalize(id: string): Promise<VerificationResult> {
  const MAX_TRIES = 90;
  for (let attempt = 0; attempt < MAX_TRIES; attempt += 1) {
    const res = await fetch(`/api/verifications/${id}/finalize`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.result) return data.result as VerificationResult;
    if (res.status === 404 || res.status === 502 || res.status === 500) {
      throw new Error(data.error ?? "Verification failed");
    }
    // 409 (not submitted yet) or transient network state — wait and retry.
    await new Promise((resolve) => setTimeout(resolve, 4_000));
  }
  throw new Error("GenLayer consensus is taking longer than expected. Refresh to check the result.");
}

export default function VerifyPage() {
  const { id } = useParams<{ id: string }>(); const [verification, setVerification] = useState<Verification | null>(null); const [result, setResult] = useState<VerificationResult | null>(null); const [running, setRunning] = useState(false); const [revealed, setRevealed] = useState(false); const [checking, setChecking] = useState(false); const [error, setError] = useState<string | null>(null); const [notFound, setNotFound] = useState(false); const bootedRef = useRef(false);
  useEffect(() => { if (bootedRef.current) return; bootedRef.current = true; (async () => { try { const res = await fetch(`/api/verifications/${id}`); if (!res.ok) throw new Error("not found"); const { verification: v } = await res.json(); setVerification(v); if (v.result) { setResult(v.result); setRunning(true); return; } if (v.demo) { const vr = await fetch(`/api/verifications/${id}/verify`, { method: "POST" }); const data = await vr.json(); if (!vr.ok) throw new Error(data.error ?? "Verification failed"); setResult(data.result); setRunning(true); return; } setChecking(true); const vr = await fetch(`/api/verifications/${id}/verify`, { method: "POST" }); const data = await vr.json(); if (!vr.ok) throw new Error(data.error ?? "Verification failed"); const final = await pollFinalize(id); setResult(final); setRunning(true); } catch (err) { const msg = err instanceof Error ? err.message : "Failed to load verification"; if (msg === "not found") setNotFound(true); else setError(msg); } finally { setChecking(false); } })(); }, [id]);
  if (notFound) return <div className="mx-auto max-w-2xl px-5 py-24 text-center"><h1 className="text-2xl font-bold">Verification not found</h1><Link href="/jobs" className="btn-secondary mt-6 inline-flex">← Back to dashboard</Link></div>;
  if (!verification) return <div className="mx-auto max-w-2xl px-5 py-24 text-center text-[var(--muted)]"><span className="pulse-glow">Loading agreement…</span></div>;
  return <div className="mx-auto max-w-5xl px-5 py-12 md:py-16"><Link href={`/jobs/${id}`} className="text-sm font-semibold text-[var(--muted)] hover:text-[var(--orange-dark)]">← Job detail</Link><div className="mt-6 flex flex-col gap-3 border-b border-[var(--border)] pb-8 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">Live verification</p><h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">{verification.title}</h1><p className="mt-2 text-sm text-[var(--muted)]">{verification.agent} · {verification.creator}</p></div>{verification.demo && <span className="status-badge status-neutral">DEMO · SIMULATED</span>}</div>{verification.demo && <div className="mt-8"><AgentSimulator running={running} /></div>}{error && <div role="alert" className="card mt-8 border-[#efb8b0] p-6 text-sm text-[var(--red)]">{error}</div>}{checking && <div className="mt-8"><div className="card p-6"><p className="pulse-glow font-semibold text-[var(--orange-dark)]">GenLayer consensus is finalizing the decision…</p><p className="mt-2 text-sm text-[var(--muted)]">Validators are converging on a stable verdict. This can take a few minutes; the proof appears here when ready.</p></div></div>}{running && !revealed && <div className="mt-8"><StageSequence running={running} result={result} mode={result?.mode ?? "demo"} onDone={() => { setRunning(false); setRevealed(true); }} /></div>}{revealed && result && <div className="stage-in mt-8"><ResultPanel result={result} requirements={verification.requirements} /><div className="mt-8 flex flex-wrap gap-3"><Link href="/demo" className="btn-primary">Run another demo <span aria-hidden>→</span></Link><Link href={`/jobs/${id}`} className="btn-secondary">Back to job</Link></div></div>}</div>;
}
