const STEPS = [
  { icon: "🤖", title: "Agent submits", sub: "deliverable + evidence" },
  { icon: "📦", title: "Evidence", sub: "deterministic checks" },
  { icon: "⚡", title: "GenLayer", sub: "intelligent contract" },
  { icon: "⚖️", title: "Consensus", sub: "equivalence principle" },
  { icon: "✅", title: "PASS / FAIL", sub: "auditable decision" },
];

export function PipelineDiagram() {
  return (
    <div className="card relative overflow-hidden p-6">
      <div className="radial-fade pointer-events-none absolute inset-0" />
      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <span className="font-mono text-xs text-slate-500">verification pipeline</span>
          <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 font-mono text-[10px] text-cyan-300">
            on-chain · consensus
          </span>
        </div>

        <div className="flex flex-col items-stretch gap-1.5">
          {STEPS.map((s, i) => (
            <div key={s.title}>
              <div className="pipe-node flex items-center gap-3 text-left">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-base">
                  {s.icon}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white">{s.title}</div>
                  <div className="truncate font-mono text-[11px] text-slate-500">{s.sub}</div>
                </div>
                <span className="ml-auto font-mono text-[10px] text-slate-600">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="pipe-arrow py-0.5">
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 rotate-90 text-slate-600">
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}