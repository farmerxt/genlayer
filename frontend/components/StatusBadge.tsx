import type { VerificationStatus } from "@/lib/types";

const STATUS_STYLES: Record<VerificationStatus, string> = {
  OPEN: "border-slate-500/40 bg-slate-500/10 text-slate-300",
  SUBMITTED: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  VERIFYING: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
  PASSED: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  FAILED: "border-rose-500/40 bg-rose-500/10 text-rose-300",
};

export function StatusBadge({ status }: { status: VerificationStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${STATUS_STYLES[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export function DecisionBadge({ decision }: { decision: "PASS" | "FAIL" }) {
  if (decision === "PASS") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/50 bg-emerald-500/15 px-3 py-1 text-sm font-bold text-emerald-300">
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
          <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        PASS
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/50 bg-rose-500/15 px-3 py-1 text-sm font-bold text-rose-300">
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      FAIL
    </span>
  );
}

export function ModeBadge({ mode }: { mode: "demo" | "genlayer" }) {
  if (mode === "genlayer") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/50 bg-violet-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-violet-300">
        LIVE · GENLAYER
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-500/40 bg-slate-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-slate-300">
      DEMO MODE
    </span>
  );
}