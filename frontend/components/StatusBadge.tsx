import type { VerificationStatus } from "@/lib/types";

const STATUS_STYLES: Record<VerificationStatus, { className: string; icon: string; label: string }> = {
  OPEN: { className: "status-neutral", icon: "○", label: "DRAFT" },
  SUBMITTED: { className: "status-warning", icon: "↑", label: "SUBMITTED" },
  VERIFYING: { className: "status-live", icon: "◌", label: "CHECKING" },
  PASSED: { className: "status-success", icon: "✓", label: "VERIFIED" },
  FAILED: { className: "status-danger", icon: "×", label: "FAILED" },
};

export function StatusBadge({ status }: { status: VerificationStatus }) {
  const style = STATUS_STYLES[status];
  return <span className={`status-badge ${style.className}`}><span aria-hidden>{style.icon}</span>{style.label}</span>;
}

export function DecisionBadge({ decision }: { decision: "PASS" | "FAIL" }) {
  return decision === "PASS"
    ? <span className="status-badge status-success text-sm"><span aria-hidden>✓</span> PASS</span>
    : <span className="status-badge status-danger text-sm"><span aria-hidden>×</span> FAIL</span>;
}

export function ModeBadge({ mode }: { mode: "demo" | "genlayer" }) {
  return mode === "genlayer"
    ? <span className="status-badge status-live"><span aria-hidden>●</span> LIVE · ON-CHAIN</span>
    : <span className="status-badge status-neutral">DEMO · SIMULATED</span>;
}
