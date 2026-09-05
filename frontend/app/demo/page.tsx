import type { Metadata } from "next";
import { DemoPicker } from "@/components/DemoPicker";

export const metadata: Metadata = {
  title: "Live Demo — AgentzProof",
  description: "Run a built-in verification demo: a buggy password-reset implementation (FAIL) and a corrected one (PASS), adjudicated like the real thing.",
};

export default function DemoPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-14">
      <div className="mb-10 text-center">
        <p className="font-mono text-xs text-cyan-400">/demo</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
          Live demo
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
          Pick a scenario. The agent simulator will submit the work, and
          AgentzProof will verify it against the original acceptance criteria —
          deterministic checks first, GenLayer adjudication for the rest.
        </p>
      </div>

      <DemoPicker />

      <div className="card mt-10 border-cyan-400/20 p-6">
        <h2 className="text-sm font-semibold text-white">What you&apos;ll see</h2>
        <ol className="mt-3 space-y-2 text-sm text-slate-400">
          <li className="flex gap-2"><span className="text-cyan-300">1.</span> The original acceptance criteria</li>
          <li className="flex gap-2"><span className="text-cyan-300">2.</span> The submitted deliverable + evidence</li>
          <li className="flex gap-2"><span className="text-cyan-300">3.</span> Deterministic checks — real, run against the submission</li>
          <li className="flex gap-2"><span className="text-cyan-300">4.</span> GenLayer adjudication & consensus (demo mode unless the contract is deployed)</li>
          <li className="flex gap-2"><span className="text-cyan-300">5.</span> PASS / FAIL with per-requirement reasons and evidence used</li>
        </ol>
        <p className="mt-4 rounded-lg border border-white/5 bg-black/30 px-4 py-3 text-xs leading-relaxed text-slate-500">
          Demo mode runs the same deterministic checks and structured
          adjudication the on-chain contract performs, but does not require a
          deployed contract, wallet, or funds. The result panel always labels
          the source honestly. Deploy the contract (see README) to run LIVE.
        </p>
      </div>
    </div>
  );
}