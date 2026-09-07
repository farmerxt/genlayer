const STEPS = [
  { icon: "↑", title: "Agent submits", sub: "deliverable + evidence" },
  { icon: "▣", title: "Evidence", sub: "supporting material" },
  { icon: "✓", title: "Deterministic checks", sub: "files, functions, tests" },
  { icon: "◎", title: "GenLayer consensus", sub: "independent judgment" },
  { icon: "✓", title: "Verified proof", sub: "auditable PASS / FAIL" },
];

export function PipelineDiagram() {
  return <div className="pipeline-card">
    <div className="pipeline-heading"><span className="eyebrow">Verification pipeline</span><span className="network-pill">BRADBURY · 4221</span></div>
    <div className="pipeline-steps">
      {STEPS.map((step, i) => <div key={step.title} className="pipeline-step-wrap">
        <div className="pipeline-step"><span className="pipeline-icon" aria-hidden>{step.icon}</span><div><div className="pipeline-title">{step.title}</div><div className="pipeline-sub">{step.sub}</div></div><span className="pipeline-number">{String(i + 1).padStart(2, "0")}</span></div>
        {i < STEPS.length - 1 && <div className="pipeline-arrow" aria-hidden>↓</div>}
      </div>)}
    </div>
  </div>;
}
