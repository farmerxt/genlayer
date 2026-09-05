import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About — AgentzProof",
  description: "How AgentzProof verifies AI-agent work with GenLayer Intelligent Contracts: deterministic checks, LLM adjudication, and the Equivalence Principle.",
};

const SECTIONS = [
  {
    title: "The problem",
    body: "AI agents can autonomously perform jobs — but when an agent submits work, the buyer (human, agent, or smart contract) has no trustworthy way to know whether the work actually satisfies the agreement. Trusting the agent's own report defeats the point of autonomy.",
  },
  {
    title: "The solution",
    body: "AgentzProof is a verification layer: the buyer defines the task, acceptance criteria, evidence requirements, and optional reward. The agent submits a deliverable plus evidence. AgentzProof runs deterministic checks, then submits the request to a GenLayer Intelligent Contract that adjudicates the subjective part and records a structured PASS / FAIL.",
  },
  {
    title: "Why GenLayer",
    body: "Ordinary smart contracts verify deterministic facts — signatures, balances, bytecode. They cannot read a deliverable and decide whether it satisfies a natural-language requirement. GenLayer Intelligent Contracts can: they run Python on-chain, call LLMs natively, access the web, and reach consensus through the Equivalence Principle — independent validators must agree on the same result. That is exactly the judgment layer agentic transactions need.",
  },
  {
    title: "Consensus design",
    body: "The contract separates deterministic checks from subjective judgment. Deterministic facts (strings, functions, files, reported test outcomes, reachable URLs) are computed by the contract itself and become ground truth. The LLM only ever outputs stable PASS / FAIL statuses for the requirements that need judgment — never free-form prose — so validators' outputs can satisfy strict equality. Reasons, scores, and summaries are assembled deterministically from those statuses.",
  },
  {
    title: "Security",
    body: "Submitted deliverables, evidence, and web content are untrusted data. Verification instructions are built only by the contract; agent content is wrapped in explicit data regions. The contract validates LLM output shape, ignores anything outside it, and never lets submitted content redefine the criteria. Evidence URLs are validated, size-capped, and fetched only when supplied. Arbitrary submitted code is never executed — the demo test suite is a fixed, read-only fixture.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <div className="mb-10">
        <p className="font-mono text-xs text-cyan-400">/about</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
          Proof for the agentic economy
        </h1>
        <p className="mt-3 text-slate-400">
          AI agents can do the work. AgentzProof verifies it.
        </p>
      </div>

      <div className="space-y-6">
        {SECTIONS.map((s) => (
          <section key={s.title} className="card p-6">
            <h2 className="text-lg font-semibold text-white">{s.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{s.body}</p>
          </section>
        ))}
      </div>

      <div className="card mt-10 flex flex-col items-center gap-4 p-8 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <h2 className="font-semibold text-white">Try it now</h2>
          <p className="mt-1 text-sm text-slate-400">Two-minute demo. No wallet, no funds.</p>
        </div>
        <Link href="/demo" className="btn-primary shrink-0">RUN THE DEMO</Link>
      </div>
    </div>
  );
}