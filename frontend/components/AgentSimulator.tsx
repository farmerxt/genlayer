"use client";

import { useEffect, useRef, useState } from "react";

const LOG_STEPS = [
  "> Agent received task",
  "> Parsed acceptance criteria (6 requirements)",
  "> Inspected repository fixture",
  "> Generated implementation (reset.py)",
  "> Ran test suite: tests/test_password_reset.py",
  "> Submitted deliverable + evidence",
  "> Awaiting independent verification",
];

export function AgentSimulator({ running }: { running: boolean }) {
  const [visible, setVisible] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!running || startedRef.current) return;
    startedRef.current = true;
    LOG_STEPS.forEach((_, i) => {
      setTimeout(() => setVisible(i + 1), 350 + i * 500);
    });
  }, [running]);

  return (
    <div className="terminal">
      <div className="terminal-titlebar">
        <span className="terminal-dot bg-rose-500/70" />
        <span className="terminal-dot bg-amber-500/70" />
        <span className="terminal-dot bg-emerald-500/70" />
        <span className="ml-2">agent-simulator — autonomous agent</span>
        <span className="ml-auto rounded border border-white/10 px-1.5 py-0.5 text-[9px] text-slate-500">
          SIMULATED
        </span>
      </div>
      <div className="relative h-56 overflow-hidden p-4">
        <div className="scanline pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-transparent via-cyan-400/[0.04] to-transparent" />
        <div className="space-y-1.5">
          {LOG_STEPS.slice(0, visible).map((line, i) => (
            <div key={i} className="stage-in flex gap-2">
              <span className="text-slate-600">{String(i + 1).padStart(2, "0")}</span>
              <span
                className={
                  line.startsWith("> Agent received") || line.includes("Submitted")
                    ? "text-cyan-300"
                    : line.includes("Ran test") || line.includes("awaiting")
                      ? "text-amber-300"
                      : "text-slate-400"
                }
              >
                {line}
              </span>
            </div>
          ))}
          {running && visible < LOG_STEPS.length && (
            <div className="cursor-blink text-slate-500">▍</div>
          )}
          {visible >= LOG_STEPS.length && (
            <div className="stage-in mt-2 rounded border border-emerald-500/30 bg-emerald-500/[0.06] px-3 py-2 text-emerald-300">
              {String.fromCharCode(62)} Deliverable submitted — awaiting independent verification
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-white/5 px-4 py-2 font-mono text-[10px] text-slate-600">
        demo tool — simulates an autonomous agent; it is not a claim that an
        external agent performed the work
      </div>
    </div>
  );
}