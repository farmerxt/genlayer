import Link from "next/link";
import { PipelineDiagram } from "@/components/PipelineDiagram";

const DIFFERENTIATOR_POINTS = [
  {
    title: "Deterministic facts first",
    body: "Required files, functions, strings, and test outcomes are checked with pure, byte-identical logic — ground truth no LLM can override.",
  },
  {
    title: "GenLayer judges the rest",
    body: "“Did this work actually satisfy the agreement?” is a judgment call. The AgentzProof Intelligent Contract runs it through GenLayer's Equivalence Principle.",
  },
  {
    title: "Consensus-friendly by design",
    body: "LLMs emit only stable PASS/FAIL statuses. Reasons are assembled deterministically, so independent validators converge — no prose to disagree over.",
  },
  {
    title: "Injection-resistant",
    body: "Deliverables, evidence, and web content are untrusted data. The verifier's instructions are built by the contract — never by the agent.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="grid-bg relative overflow-hidden">
        <div className="radial-fade absolute inset-0" />
        <div className="radial-violet absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-16 md:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/[0.06] px-4 py-1.5 font-mono text-xs text-cyan-300">
              <span className="pulse-glow h-1.5 w-1.5 rounded-full bg-cyan-300" />
              GENLAYER INTELLIGENT CONTRACT — AGENT TANK 2026
            </div>
            <h1 className="text-5xl font-extrabold tracking-tight md:text-7xl">
              AGENTZ
              <span className="gradient-text">PROOF</span>
            </h1>
            <p className="mt-4 text-2xl font-bold tracking-tight text-slate-200 md:text-3xl">
              PROOF FOR THE AGENTIC ECONOMY.
            </p>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-400">
              AI agents can produce work autonomously. AgentzProof gives that
              work an independent verification layer — adjudicated by GenLayer
              against the original agreement.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/create" className="btn-primary w-full sm:w-auto">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
                CREATE VERIFICATION
              </Link>
              <Link href="/demo" className="btn-secondary w-full sm:w-auto">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-cyan-300">
                  <path d="M6 3l14 9-14 9V3z" fill="currentColor" />
                </svg>
                TRY LIVE DEMO
              </Link>
            </div>
          </div>

          <div className="mx-auto mt-14 max-w-md">
            <PipelineDiagram />
          </div>
        </div>
      </section>

      {/* ── The problem / why ─────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Why ordinary smart contracts aren&apos;t enough
          </h2>            <p className="mt-4 text-slate-400">
              Traditional smart contracts can verify deterministic facts — a
              payment arrived, a signature is valid. But when the question is{" "}
              <span className="text-slate-200">
                “did this work actually satisfy the agreement?”
              </span>
              , the answer requires reading, reasoning, and judgment.
            </p>
          <p className="mt-3 text-slate-400">
            AgentzProof uses{" "}
            <span className="font-semibold text-cyan-300">GenLayer</span> for
            exactly that: an Intelligent Contract that inspects the submitted
            deliverable, runs deterministic checks, and adjudicates subjective
            requirements with LLM validators that must reach consensus.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {DIFFERENTIATOR_POINTS.map((p) => (
            <div key={p.title} className="card card-hover p-6">
              <h3 className="flex items-center gap-2 font-semibold text-white">
                <span className="grid h-6 w-6 place-items-center rounded-md border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                    <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {p.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────── */}
      <section className="border-t border-white/5">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-center text-3xl font-bold tracking-tight text-white">
            How verification works
          </h2>
          <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: "01", t: "Create agreement", b: "Define the task, acceptance criteria, evidence requirements, and optional reward." },
              { n: "02", t: "Agent submits work", b: "Deliverable, evidence, optional repository / PR / commit reference." },
              { n: "03", t: "Deterministic checks", b: "Files, functions, strings, and test outcomes verified with pure logic." },
              { n: "04", t: "GenLayer adjudicates", b: "Subjective requirements judged by LLM validators under the Equivalence Principle." },
              { n: "05", t: "Consensus", b: "Validators must converge on identical PASS/FAIL statuses." },
              { n: "06", t: "Recorded decision", b: "PASS / FAIL with per-requirement reasons and evidence used — on-chain." },
            ].map((s) => (
              <div key={s.n} className="card p-5">
                <div className="font-mono text-xs text-cyan-400">{s.n}</div>
                <h3 className="mt-2 font-semibold text-white">{s.t}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{s.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Demo teaser ───────────────────────────────────── */}
      <section className="border-t border-white/5">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="card relative overflow-hidden p-8 md:p-12">
            <div className="radial-fade pointer-events-none absolute inset-0" />
            <div className="relative grid items-center gap-8 md:grid-cols-2">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-white">
                  See a real verification in{" "}
                  <span className="gradient-text">2 minutes</span>
                </h2>
                <p className="mt-4 text-slate-400">
                  Watch an agent submit a password-reset implementation that
                  contains a subtle bug — and see AgentzProof catch it. Then run
                  the corrected submission and watch it pass. No configuration,
                  no wallet, no funds required.
                </p>
                <div className="mt-6 flex gap-3">
                  <Link href="/demo" className="btn-primary">
                    OPEN THE DEMO
                  </Link>
                  <Link href="/create" className="btn-secondary">
                    CREATE YOUR OWN
                  </Link>
                </div>
              </div>
              <div className="card bg-black/30 p-5">
                <div className="mb-3 flex items-center justify-between font-mono text-[11px] text-slate-500">
                  <span>password-reset · verification result</span>
                  <span className="text-rose-400">DEMO</span>
                </div>
                {[
                  ["Password reset request", "PASS"],
                  ["Token generation", "PASS"],
                  ["Token expiration", "PASS"],
                  ["Password update", "PASS"],
                  ["Test coverage", "PASS"],
                  ["Expired tokens rejected", "FAIL"],
                ].map(([label, status]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between border-t border-white/5 py-2 text-xs"
                  >
                    <span className="text-slate-400">{label}</span>
                    <span
                      className={`font-mono font-bold ${
                        status === "PASS" ? "text-emerald-300" : "text-rose-300"
                      }`}
                    >
                      {status === "PASS" ? "✓" : "✕"} {status}
                    </span>
                  </div>
                ))}
                <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
                  <span className="text-xs font-semibold text-slate-300">FINAL DECISION</span>
                  <span className="font-mono text-lg font-black text-rose-400">FAIL</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}