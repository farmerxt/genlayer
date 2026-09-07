"use client";

import { useState } from "react";
import type { RequirementResult, RequirementSpec } from "@/lib/types";

interface Props { requirements: RequirementSpec[]; results?: RequirementResult[]; }

export function RequirementList({ requirements, results }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (!results) return <ul className="requirement-list">{requirements.map((r) => <li key={r.id} className="requirement-row"><span className="requirement-id">{r.id}</span><span className="text-sm text-[var(--text)]">{r.text}</span></li>)}</ul>;
  const byId = new Map(results.map((r) => [r.id, r]));
  return <ul className="requirement-list">{requirements.map((r) => {
    const res = byId.get(r.id); const isOpen = expanded === r.id; const pass = res?.status === "PASS";
    return <li key={r.id}><button onClick={() => setExpanded(isOpen ? null : r.id)} className="requirement-row requirement-button" aria-expanded={isOpen}>
      <span className={`requirement-id ${pass ? "requirement-id-pass" : "requirement-id-fail"}`}>{r.id}</span><span className="min-w-0 flex-1 text-left"><span className="block text-sm text-[var(--text)]">{r.text}</span><span className="mt-1 flex flex-wrap items-center gap-2 text-[11px]"><span className={pass ? "decision-pass" : "decision-fail"}>{pass ? "✓ PASS" : "✕ FAIL"}</span><span className="font-mono text-[var(--muted)]">{res?.checkedBy === "deterministic" ? "deterministic check" : "LLM adjudication"}</span></span></span><span className={`requirement-chevron ${isOpen ? "rotate-180" : ""}`} aria-hidden>⌄</span>
    </button>{isOpen && res && <div className="requirement-detail"><p className="text-xs leading-relaxed text-[var(--muted)]"><strong className="text-[var(--text)]">Reason: </strong>{res.reason}</p>{res.check && <p className="mt-2 font-mono text-[11px] text-[var(--soft-muted)]">check: {JSON.stringify(res.check)}</p>}</div>}</li>;
  })}</ul>;
}
