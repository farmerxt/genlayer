"use client";

import { useEffect, useRef, useState } from "react";
import type { VerificationResult } from "@/lib/types";

export interface Stage {
  key: string;
  title: string;
  detail: string;
}

const BASE_STAGES: Stage[] = [
  { key: "agreement", title: "Loading agreement", detail: "Fetching original task & acceptance criteria" },
  { key: "requirements", title: "Parsing requirements", detail: "Normalizing criteria into checkable requirements" },
  { key: "deterministic", title: "Checking deterministic evidence", detail: "String / function / file / test-suite checks" },
  { key: "work", title: "Inspecting submitted work", detail: "Scanning deliverable & evidence" },
  { key: "genlayer", title: "GenLayer adjudication", detail: "Subjective requirements → intelligent contract" },
  { key: "consensus", title: "Consensus", detail: "Equivalence-principle agreement across validators" },
  { key: "result", title: "Final result", detail: "Decision committed" },
];

/**
 * The stage sequence is *presentation*: the API runs the full verification
 * (deterministic checks + adjudication) synchronously, and this component
 * replays the stages over the real result. Every stage maps to something the
 * service actually did, and the result panel labels the adjudication source
 * (DEMO MODE vs LIVE GENLAYER) honestly.
 */
export function StageSequence({
  running,
  result,
  mode,
  onDone,
}: {
  running: boolean;
  result: VerificationResult | null;
  mode: "demo" | "genlayer";
  onDone: () => void;
}) {
  const [active, setActive] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!running) return;
    // Reset via a scheduled task (avoids synchronous setState in the effect
    // body) and drive the stage progression with timers only.
    const resetTimer = setTimeout(() => {
      setActive(0);
      doneRef.current = false;
    }, 0);
    const timers: ReturnType<typeof setTimeout>[] = [resetTimer];
    BASE_STAGES.forEach((_, i) => {
      timers.push(
        setTimeout(() => {
          setActive(i + 1);
          if (i === BASE_STAGES.length - 1 && !doneRef.current) {
            doneRef.current = true;
            setTimeout(onDone, 450);
          }
        }, i === 0 ? 250 : 620 + Math.min(i * 240, 900)),
      );
    });
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const finalIndex = BASE_STAGES.length - 1;
  const complete = active >= finalIndex && result !== null;

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Verification sequence
        </h3>
        <span className="font-mono text-xs text-slate-500">
          {mode === "genlayer" ? "LIVE · on-chain" : "DEMO MODE · simulated"}
        </span>
      </div>
      <ol className="space-y-2">
        {BASE_STAGES.map((s, i) => {
          const state =
            active > i || complete
              ? "done"
              : active === i && running
                ? "active"
                : "pending";
          return (
            <li
              key={s.key}
              className={`stage-in flex items-center gap-3 rounded-lg border px-4 py-3 transition-all ${
                state === "done"
                  ? "border-emerald-500/25 bg-emerald-500/[0.06]"
                  : state === "active"
                    ? "border-cyan-500/40 bg-cyan-500/[0.07] glow-cyan"
                    : "border-white/5 bg-white/[0.02] opacity-50"
              }`}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5">
                {state === "done" ? (
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-emerald-300">
                    <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : state === "active" ? (
                  <span className="pulse-glow h-2 w-2 rounded-full bg-cyan-300" />
                ) : (
                  <span className="font-mono text-[10px] text-slate-500">{i + 1}</span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-200">{s.title}</div>
                <div className="truncate font-mono text-[11px] text-slate-500">{s.detail}</div>
              </div>
              {state === "active" && (
                <span className="cursor-blink font-mono text-xs text-cyan-300">▍</span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}