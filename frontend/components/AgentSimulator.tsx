"use client";

import { useEffect, useRef, useState } from "react";

const LOG_STEPS = ["Agent received task", "Parsed acceptance criteria (6 requirements)", "Inspected repository fixture", "Generated implementation (reset.py)", "Ran test suite: tests/test_password_reset.py", "Submitted deliverable + evidence"];

export function AgentSimulator({ running }: { running: boolean }) {
  const [visible, setVisible] = useState(0); const startedRef = useRef(false);
  useEffect(() => { if (!running || startedRef.current) return; startedRef.current = true; const timers = LOG_STEPS.map((_, i) => setTimeout(() => setVisible(i + 1), 350 + i * 500)); return () => timers.forEach(clearTimeout); }, [running]);
  return <div className="terminal"><div className="terminal-titlebar"><span className="terminal-dot bg-[#e66a5c]" /><span className="terminal-dot bg-[#e0a33a]" /><span className="terminal-dot bg-[#65a878]" /><span className="ml-2">agent-simulator · autonomous agent</span><span className="ml-auto rounded border border-white/10 px-1.5 py-0.5 text-[9px] text-[#bdb5aa]">SIMULATED</span></div><div className="relative min-h-56 overflow-hidden p-4"><div className="scanline pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-transparent via-[#ff6b35]/10 to-transparent" /><div className="space-y-2">{LOG_STEPS.slice(0, visible).map((line, i) => <div key={line} className="stage-in flex gap-3"><span className="text-[#81786e]">{String(i + 1).padStart(2, "0")}</span><span className={i === 0 || i === LOG_STEPS.length - 1 ? "text-[#ffad91]" : "text-[#d4cbc0]"}>{line}</span></div>)}{running && visible < LOG_STEPS.length && <div className="cursor-blink text-[#ffad91]">▍</div>}{visible >= LOG_STEPS.length && <div className="stage-in mt-3 rounded border border-[#65a878]/40 bg-[#65a878]/10 px-3 py-2 text-[#b4e2bd]">Deliverable submitted · ready for verification</div>}</div></div><div className="border-t border-[#403b36] px-4 py-2 font-mono text-[10px] text-[#81786e]">Demo theater only · no external agent is being executed</div></div>;
}
