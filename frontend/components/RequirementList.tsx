"use client";

import { useState } from "react";
import type { RequirementResult, RequirementSpec } from "@/lib/types";

interface Props {
  requirements: RequirementSpec[];
  results?: RequirementResult[];
}

export function RequirementList({ requirements, results }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!results) {
    return (
      <ul className="space-y-2">
        {requirements.map((r) => (
          <li
            key={r.id}
            className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3"
          >
            <span className="mt-0.5 shrink-0 rounded border border-slate-600/50 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
              {r.id}
            </span>
            <span className="text-sm text-slate-300">{r.text}</span>
          </li>
        ))}
      </ul>
    );
  }

  const byId = new Map(results.map((r) => [r.id, r]));
  return (
    <ul className="space-y-2">
      {requirements.map((r) => {
        const res = byId.get(r.id);
        const isOpen = expanded === r.id;
        return (
          <li key={r.id}>
            <button
              onClick={() => setExpanded(isOpen ? null : r.id)}
              className="flex w-full items-start gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3 text-left transition-colors hover:bg-white/[0.04]"
            >
              <span
                className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] ${
                  res?.status === "PASS"
                    ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border border-rose-500/40 bg-rose-500/10 text-rose-300"
                }`}
              >
                {r.id}
              </span>
              <span className="flex-1">
                <span className="text-sm text-slate-300">{r.text}</span>
                {res && (
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                    <span
                      className={`font-bold ${
                        res.status === "PASS" ? "text-emerald-300" : "text-rose-300"
                      }`}
                    >
                      {res.status === "PASS" ? "✓ PASS" : "✕ FAIL"}
                    </span>
                    <span className="font-mono text-slate-500">
                      {res.checkedBy === "deterministic" ? "deterministic check" : "llm adjudication"}
                    </span>
                  </span>
                )}
              </span>
              {res && (
                <span className="mt-0.5 shrink-0 text-slate-600">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  >
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              )}
            </button>
            {isOpen && res && (
              <div className="stage-in mx-3 mb-2 mt-1 rounded-lg border border-white/5 bg-black/30 px-4 py-3">
                <p className="text-xs leading-relaxed text-slate-400">
                  <span className="font-semibold text-slate-300">Reason: </span>
                  {res.reason}
                </p>
                {res.check && (
                  <p className="mt-1.5 font-mono text-[11px] text-slate-500">
                    check: {JSON.stringify(res.check)}
                  </p>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}