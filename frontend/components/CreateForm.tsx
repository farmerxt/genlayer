"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CHECK_TYPES = [
  { value: "", label: "No check (LLM adjudicates)" },
  { value: "string_present", label: "String must be present" },
  { value: "function_exists", label: "Function must exist" },
  { value: "regex", label: "Pattern must match" },
  { value: "file_exists", label: "File must be in manifest" },
  { value: "http_status", label: "URL must be reachable" },
];

interface Row {
  id: number;
  text: string;
  checkType: string;
  checkValue: string;
}

export function CreateForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creator, setCreator] = useState("");
  const [agent, setAgent] = useState("");
  const [reward, setReward] = useState("");
  const [deadline, setDeadline] = useState("");
  const [rows, setRows] = useState<Row[]>([{ id: 1, text: "", checkType: "", checkValue: "" }]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateRow(id: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((rs) => [...rs, { id: Date.now(), text: "", checkType: "", checkValue: "" }]);
  }

  function removeRow(id: number) {
    setRows((rs) => rs.filter((r) => r.id !== id));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const criteria = rows
      .filter((r) => r.text.trim())
      .map((r, i) => {
        const check = (() => {
          switch (r.checkType) {
            case "string_present":
              return { type: "string_present" as const, needle: r.checkValue.trim() || r.text.trim() };
            case "function_exists":
              return { type: "function_exists" as const, name: r.checkValue.trim() || "main" };
            case "regex":
              return { type: "regex" as const, pattern: r.checkValue.trim() || "." };
            case "file_exists":
              return { type: "file_exists" as const, path: r.checkValue.trim() };
            case "http_status":
              return { type: "http_status" as const, url: r.checkValue.trim() };
            default:
              return undefined;
          }
        })();
        return { id: `REQ-${i + 1}`, text: r.text.trim(), check };
      });

    if (!title.trim()) {
      setError("Task name is required.");
      return;
    }
    if (criteria.length === 0) {
      setError("At least one acceptance criterion is required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/verifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          task: description.trim(),
          creator: creator.trim() || "Anonymous Buyer",
          agent: agent.trim() || "Unassigned",
          reward: reward.trim() || undefined,
          deadline: deadline.trim() || undefined,
          requirements: criteria,
          evidenceRequirements: ["Deliverable summary", "Supporting evidence"],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create verification");
      router.push(`/jobs/${data.verification.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create verification");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="label">Task name *</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Implement a password reset flow"
          />
        </div>
        <div className="md:col-span-2">
          <label className="label">Task description</label>
          <textarea
            className="input min-h-24 resize-y"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the work the agent must perform and the context…"
          />
        </div>
        <div>
          <label className="label">Creator / buyer</label>
          <input className="input" value={creator} onChange={(e) => setCreator(e.target.value)} placeholder="Your name or address" />
        </div>
        <div>
          <label className="label">Expected agent</label>
          <input className="input" value={agent} onChange={(e) => setAgent(e.target.value)} placeholder="Agent name (optional)" />
        </div>
        <div>
          <label className="label">Reward (optional)</label>
          <input className="input" value={reward} onChange={(e) => setReward(e.target.value)} placeholder="e.g. 0.1 GEN (testnet)" />
        </div>
        <div>
          <label className="label">Deadline (optional)</label>
          <input className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} placeholder="YYYY-MM-DD or relative" />
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Acceptance criteria</h3>
          <button type="button" onClick={addRow} className="btn-secondary !py-1.5 !px-3 text-xs">
            + Add criterion
          </button>
        </div>
        <div className="space-y-3">
          {rows.map((r, i) => (
            <div key={r.id} className="card flex flex-col gap-3 p-4 md:flex-row md:items-center">
              <span className="shrink-0 font-mono text-[10px] text-slate-500">REQ-{i + 1}</span>
              <input
                className="input flex-1"
                value={r.text}
                onChange={(e) => updateRow(r.id, { text: e.target.value })}
                placeholder="e.g. Invalid or expired tokens are rejected"
              />
              <div className="flex gap-2">
                <select
                  className="input w-44 shrink-0 !py-2 text-xs"
                  value={r.checkType}
                  onChange={(e) => updateRow(r.id, { checkType: e.target.value })}
                >
                  {CHECK_TYPES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                {r.checkType && r.checkType !== "http_status" && (
                  <input
                    className="input w-48 shrink-0 !py-2 text-xs"
                    value={r.checkValue}
                    onChange={(e) => updateRow(r.id, { checkValue: e.target.value })}
                    placeholder={
                      r.checkType === "string_present"
                        ? "required string"
                        : r.checkType === "function_exists"
                          ? "function name"
                          : r.checkType === "file_exists"
                            ? "file path"
                            : "pattern"
                    }
                  />
                )}
                {r.checkType === "http_status" && (
                  <input
                    className="input w-48 shrink-0 !py-2 text-xs"
                    value={r.checkValue}
                    onChange={(e) => updateRow(r.id, { checkValue: e.target.value })}
                    placeholder="https://…"
                  />
                )}
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(r.id)}
                    className="shrink-0 rounded-lg border border-rose-500/30 px-2.5 text-xs text-rose-300 hover:bg-rose-500/10"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs text-rose-300">
          {error}
        </p>
      )}

      <div className="flex items-center gap-4">
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Creating…" : "CREATE VERIFICATION"}
        </button>
        <span className="text-xs text-slate-500">
          Verification is performed against the original acceptance criteria.
        </span>
      </div>
    </form>
  );
}