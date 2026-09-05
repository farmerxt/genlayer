"use client";

import type { VerificationResult } from "@/lib/types";
import { DecisionBadge, ModeBadge } from "@/components/StatusBadge";
import { RequirementList } from "@/components/RequirementList";

interface Props {
  result: VerificationResult;
  requirements: { id: string; text: string }[];
}

export function ResultPanel({ result, requirements }: Props) {
  const passed = result.requirements.filter((r) => r.status === "PASS").length;
  const total = result.requirements.length;

  return (
    <div className="space-y-5">
      {/* Decision banner */}
      <div
        className={`card relative overflow-hidden p-6 ${
          result.decision === "PASS" ? "glow-cyan" : ""
        }`}
      >
        <div
          className={`pointer-events-none absolute inset-0 ${
            result.decision === "PASS"
              ? "bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10"
              : "bg-gradient-to-br from-rose-500/10 via-transparent to-orange-500/10"
          }`}
        />
        <div className="relative flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-3">
            <DecisionBadge decision={result.decision} />
            <ModeBadge mode={result.mode} />
          </div>
          <p className="text-2xl font-bold tracking-tight">
            <span className={result.decision === "PASS" ? "gradient-text-green" : "gradient-text-red"}>
              {result.decision === "PASS" ? "VERIFICATION COMPLETE — PASS" : "VERIFICATION COMPLETE — FAIL"}
            </span>
          </p>
          <p className="max-w-lg text-sm text-slate-400">{result.summary}</p>

          {/* score */}
          <div className="mt-1 w-full max-w-sm">
            <div className="mb-1 flex justify-between font-mono text-xs text-slate-500">
              <span>REQUIREMENT SCORE</span>
              <span className="text-slate-300">
                {passed}/{total} · {Math.round(result.score * 100)}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/5">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  result.decision === "PASS"
                    ? "bg-gradient-to-r from-emerald-400 to-cyan-400"
                    : "bg-gradient-to-r from-rose-400 to-orange-400"
                }`}
                style={{ width: `${Math.max(result.score * 100, 4)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* GenLayer / tx info */}
      <div className="card p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Adjudication & on-chain information
        </h3>
        <dl className="grid gap-3 font-mono text-xs sm:grid-cols-2">
          <div className="rounded-lg border border-white/5 bg-black/20 p-3">
            <dt className="text-slate-500">METHOD</dt>
            <dd className="mt-1 text-slate-200">{result.consensus.method}</dd>
          </div>
          <div className="rounded-lg border border-white/5 bg-black/20 p-3">
            <dt className="text-slate-500">PRINCIPLE</dt>
            <dd className="mt-1 text-slate-200">{result.consensus.principle}</dd>
          </div>
          <div className="rounded-lg border border-white/5 bg-black/20 p-3">
            <dt className="text-slate-500">JUDGE</dt>
            <dd className="mt-1 text-slate-200">{result.consensus.judge}</dd>
          </div>
          <div className="rounded-lg border border-white/5 bg-black/20 p-3">
            <dt className="text-slate-500">VERIFICATION VERSION</dt>
            <dd className="mt-1 text-slate-200">{result.verificationVersion}</dd>
          </div>
          {result.tx ? (
            <>
              <div className="rounded-lg border border-white/5 bg-black/20 p-3 sm:col-span-2">
                <dt className="text-slate-500">CONTRACT ADDRESS</dt>
                <dd className="mt-1 break-all text-violet-300">{result.tx.contractAddress}</dd>
              </div>
              <div className="rounded-lg border border-white/5 bg-black/20 p-3 sm:col-span-2">
                <dt className="text-slate-500">TRANSACTION HASH</dt>
                <dd className="mt-1 break-all text-cyan-300">
                  {result.tx.transactionHash}
                  {result.tx.explorerUrl && (
                    <a
                      href={result.tx.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-2 text-slate-400 underline hover:text-white"
                    >
                      explorer ↗
                    </a>
                  )}
                </dd>
              </div>
              <div className="rounded-lg border border-white/5 bg-black/20 p-3">
                <dt className="text-slate-500">NETWORK</dt>
                <dd className="mt-1 text-slate-200">{result.tx.network}</dd>
              </div>
              <div className="rounded-lg border border-white/5 bg-black/20 p-3">
                <dt className="text-slate-500">STATUS</dt>
                <dd className="mt-1 text-emerald-300">{result.tx.status}</dd>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-600/40 bg-black/20 p-3 sm:col-span-2">
              <dt className="text-slate-500">ON-CHAIN STATUS</dt>
              <dd className="mt-1 text-amber-300">
                Not deployed — simulated adjudication (DEMO MODE). Deploy the
                contract and set GENLAYER_CONTRACT_ADDRESS for live consensus.
              </dd>
            </div>
          )}
          <div className="rounded-lg border border-white/5 bg-black/20 p-3 sm:col-span-2">
            <dt className="text-slate-500">VERIFIED AT</dt>
            <dd className="mt-1 text-slate-200">
              {new Date(result.verifiedAt).toISOString()}
            </dd>
          </div>
        </dl>
      </div>

      {/* Requirement-by-requirement */}
      <div className="card p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Requirement-by-requirement results
        </h3>
        <RequirementList requirements={requirements} results={result.requirements} />
      </div>

      {/* Evidence */}
      <div className="card p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Evidence used
        </h3>
        <ul className="space-y-2">
          {result.evidence.map((e, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-lg border border-white/5 bg-black/20 px-4 py-3"
            >
              <span
                className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] ${
                  e.used
                    ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border border-slate-600/40 bg-slate-600/10 text-slate-400"
                }`}
              >
                {e.used ? "USED" : "NOT USED"}
              </span>
              <div className="min-w-0">
                <p className="break-all font-mono text-xs text-slate-300">{e.source}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {e.claim}
                  {e.fetched && <span className="ml-1.5 text-cyan-400">[fetched]</span>}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}