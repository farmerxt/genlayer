"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEMO_SCENARIO_META } from "@/lib/demo/scenario-meta";

export function DemoPicker() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadScenario(id: string) {
    setLoading(id);
    setError(null);
    try {
      const res = await fetch("/api/demo/load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load demo");
      router.push(`/verify/${data.verification.id}?demo=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load demo");
      setLoading(null);
    }
  }

  return (
    <div className="space-y-3">
      {DEMO_SCENARIO_META.map((s) => (
        <div key={s.id} className="card card-hover flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-white">{s.label}</h3>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                  s.expected === "PASS"
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                    : "border-rose-500/50 bg-rose-500/10 text-rose-300"
                }`}
              >
                EXPECTED {s.expected}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">{s.tagline}</p>
          </div>
          <button
            onClick={() => loadScenario(s.id)}
            disabled={loading !== null}
            className="btn-primary shrink-0 !py-2 text-sm"
          >
            {loading === s.id ? "Loading…" : "LOAD DEMO"}
          </button>
        </div>
      ))}
      {error && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}