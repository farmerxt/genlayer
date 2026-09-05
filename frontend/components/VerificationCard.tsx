import Link from "next/link";
import type { VerificationSummary } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";

export function VerificationCard({ v }: { v: VerificationSummary }) {
  return (
    <Link
      href={`/jobs/${v.id}`}
      className="card card-hover block p-5"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-white">{v.title}</h3>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {v.creator} → {v.agent}
          </p>
        </div>
        <StatusBadge status={v.status} />
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{v.requirementCount} criteria</span>
        <span className="font-mono">
          {new Date(v.createdAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>

      {(v.decision || v.score !== undefined) && (
        <div className="mt-3 flex items-center justify-between rounded-lg border border-white/5 bg-black/20 px-3 py-2">
          <span
            className={`text-sm font-bold ${
              v.decision === "PASS" ? "text-emerald-300" : "text-rose-300"
            }`}
          >
            {v.decision ?? "—"}
          </span>
          {v.score !== undefined && (
            <span className="font-mono text-xs text-slate-400">
              {Math.round(v.score * 100)}% satisfied
            </span>
          )}
        </div>
      )}
    </Link>
  );
}