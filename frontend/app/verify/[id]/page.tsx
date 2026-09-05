"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Verification, VerificationResult } from "@/lib/types";
import { StageSequence } from "@/components/StageSequence";
import { ResultPanel } from "@/components/ResultPanel";
import { AgentSimulator } from "@/components/AgentSimulator";

export default function VerifyPage() {
  const { id } = useParams<{ id: string }>();
  const [verification, setVerification] = useState<Verification | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [running, setRunning] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const bootedRef = useRef(false);

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;

    (async () => {
      try {
        const res = await fetch(`/api/verifications/${id}`);
        if (!res.ok) throw new Error("not found");
        const { verification: v } = await res.json();
        setVerification(v);

        // If not decided yet, run the real verification now.
        let realResult = v.result ?? null;
        if (!realResult) {
          const vr = await fetch(`/api/verifications/${id}/verify`, { method: "POST" });
          const data = await vr.json();
          if (!vr.ok) throw new Error(data.error ?? "Verification failed");
          realResult = data.result;
        }
        setResult(realResult);
        setRunning(true);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load verification";
        if (msg === "not found") setNotFound(true);
        else setError(msg);
      }
    })();
  }, [id]);

  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24 text-center">
        <h1 className="text-2xl font-bold text-white">Verification not found</h1>
        <Link href="/jobs" className="btn-secondary mt-6 inline-flex">← Back to dashboard</Link>
      </div>
    );
  }
  if (!verification) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24 text-center text-slate-400">
        <p className="pulse-glow font-mono text-sm text-cyan-300">LOADING AGREEMENT…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      <Link href={`/jobs/${id}`} className="text-xs text-slate-500 hover:text-white">
        ← Job detail
      </Link>

      <div className="mt-4">
        <p className="font-mono text-xs text-cyan-400">/verify</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
          {verification.title}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Agent: {verification.agent} · Creator: {verification.creator}
        </p>
      </div>

      {/* Agent simulator (demo theater) */}
      {verification.demo && (
        <div className="mt-8">
          <AgentSimulator running={running} />
        </div>
      )}

      {error && (
        <div className="card mt-8 border-rose-500/30 p-6 text-sm text-rose-300">
          {error}
        </div>
      )}

      {running && !revealed && (
        <div className="mt-8">
          <StageSequence
            running={running}
            result={result}
            mode={result?.mode ?? "demo"}
            onDone={() => {
              setRunning(false);
              setRevealed(true);
            }}
          />
        </div>
      )}

      {revealed && result && (
        <div className="stage-in mt-8">
          <ResultPanel result={result} requirements={verification.requirements} />
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/demo" className="btn-primary">
              RUN ANOTHER DEMO
            </Link>
            <Link href={`/jobs/${id}`} className="btn-secondary">
              BACK TO JOB
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}