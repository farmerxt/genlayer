import type { Metadata } from "next";
import Link from "next/link";
import { VerificationCard } from "@/components/VerificationCard";
import { verificationStore } from "@/lib/store/verification-store";
import { getGenLayerConfig } from "@/lib/genlayer/verifier";

export const metadata: Metadata = {
  title: "Jobs — AgentzProof",
  description: "Verification dashboard — open, submitted, verifying, passed, and failed AI-agent jobs.",
};

export const dynamic = "force-dynamic";

export default function JobsPage() {
  const verifications = verificationStore.list();
  const genConfig = getGenLayerConfig();

  const statuses = ["OPEN", "SUBMITTED", "VERIFYING", "PASSED", "FAILED"] as const;
  const counts: Record<string, number> = {};
  for (const s of statuses) counts[s] = verifications.filter((v) => v.status === s).length;

  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-xs text-cyan-400">/jobs</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
            Verification dashboard
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {verifications.length} verifications
            {genConfig
              ? ` · live contract on ${genConfig.network}`
              : " · demo mode (contract not deployed)"}
          </p>
        </div>
        <Link href="/create" className="btn-primary shrink-0">
          + NEW VERIFICATION
        </Link>
      </div>

      {/* status summary */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {statuses.map((s) => (
          <div key={s} className="card p-4">
            <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{s}</div>
            <div className="mt-1 text-2xl font-bold text-white">{counts[s] ?? 0}</div>
          </div>
        ))}
      </div>

      {verifications.length === 0 ? (
        <div className="card flex flex-col items-center gap-4 p-14 text-center">
          <p className="text-slate-400">No verifications yet.</p>
          <Link href="/demo" className="btn-primary">
            TRY THE LIVE DEMO
          </Link>
          <Link href="/create" className="btn-secondary">
            CREATE VERIFICATION
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {verifications.map((v) => (
            <VerificationCard
              key={v.id}
              v={{
                id: v.id,
                title: v.title,
                status: v.status,
                creator: v.creator,
                agent: v.agent,
                requirementCount: v.requirements.length,
                decision: v.result?.decision,
                score: v.result?.score,
                createdAt: v.createdAt,
                demo: v.demo,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}