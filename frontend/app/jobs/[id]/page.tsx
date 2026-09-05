"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { Verification } from "@/lib/types";
import { StatusBadge, DecisionBadge, ModeBadge } from "@/components/StatusBadge";
import { RequirementList } from "@/components/RequirementList";

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [verification, setVerification] = useState<Verification | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [summary, setSummary] = useState("");
  const [code, setCode] = useState("");
  const [evidenceText, setEvidenceText] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [commitSha, setCommitSha] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/verifications/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("not found"))))
      .then((d) => setVerification(d.verification))
      .catch(() => setNotFound(true));
  }, [id]);

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/verifications/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent: notes.trim() || verification?.agent || "demo-agent",
          deliverable: { summary, code, files: {} },
          evidence: evidenceText.trim()
            ? [
                {
                  source: "agent evidence",
                  claim: "submitted evidence",
                  content: evidenceText,
                },
              ]
            : [],
          evidenceUrls: [],
          repository: repoUrl.trim() ? { url: repoUrl.trim(), commitSha: commitSha.trim() } : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submission failed");
      setVerification(data.verification);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function verify() {
    setError(null);
    setVerifying(true);
    try {
      const res = await fetch(`/api/verifications/${id}/verify`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Verification failed");
      router.push(`/verify/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
      setVerifying(false);
    }
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24 text-center">
        <h1 className="text-2xl font-bold text-white">Verification not found</h1>
        <Link href="/jobs" className="btn-secondary mt-6 inline-flex">
          ← Back to dashboard
        </Link>
      </div>
    );
  }
  if (!verification) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24 text-center text-slate-400">
        Loading…
      </div>
    );
  }

  const decided = verification.status === "PASSED" || verification.status === "FAILED";

  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      <Link href="/jobs" className="text-xs text-slate-500 hover:text-white">
        ← Dashboard
      </Link>

      {/* header */}
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">{verification.title}</h1>
            <StatusBadge status={verification.status} />
            {verification.demo && (
              <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
                DEMO
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {verification.creator} → {verification.agent}
            {verification.reward ? ` · reward ${verification.reward}` : ""}
            {verification.deadline ? ` · deadline ${new Date(verification.deadline).toLocaleDateString()}` : ""}
          </p>
        </div>
        {decided && verification.result && (
          <div className="flex items-center gap-3">
            <DecisionBadge decision={verification.result.decision} />
            <ModeBadge mode={verification.result.mode} />
          </div>
        )}
      </div>

      <p className="mt-5 text-sm leading-relaxed text-slate-400">
        {verification.description || verification.task}
      </p>

      {/* criteria */}
      <div className="mt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Original acceptance criteria
        </h2>
        <RequirementList
          requirements={verification.requirements}
          results={verification.result?.requirements}
        />
      </div>

      {/* submission */}
      {!decided && verification.status !== "VERIFYING" && (
        <div className="mt-10">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
            {verification.status === "SUBMITTED" ? "Submitted deliverable" : "Agent submission"}
          </h2>

          {verification.status === "SUBMITTED" ? (
            <div className="space-y-4">
              <div className="card p-5">
                <p className="whitespace-pre-wrap text-sm text-slate-300">
                  {verification.deliverable?.summary || "(no summary)"}
                </p>
                {verification.deliverable?.code && (
                  <pre className="mt-3 max-h-56 overflow-auto rounded-lg border border-white/5 bg-black/40 p-3 text-xs text-slate-400">
                    {verification.deliverable.code.slice(0, 3000)}
                  </pre>
                )}
                {verification.repository?.url && (
                  <p className="mt-3 font-mono text-xs text-cyan-300">
                    {verification.repository.url}
                    {verification.repository.commitSha ? ` @ ${verification.repository.commitSha}` : ""}
                  </p>
                )}
              </div>

              <div className="card border-amber-500/25 bg-amber-500/[0.04] p-5">
                <p className="text-sm text-amber-200/90">
                  <span className="font-semibold">Verification is performed against the original acceptance criteria.</span>{" "}
                  The submitted work is evaluated as-is — the criteria cannot be
                  changed after submission.
                </p>
              </div>

              <button onClick={verify} disabled={verifying} className="btn-primary w-full !py-3 text-base">
                {verifying ? "VERIFYING…" : "VERIFY WITH GENLAYER"}
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                  <path d="M13 5l7 7-7 7M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="card space-y-4 p-5">
              <div>
                <label className="label">Deliverable summary</label>
                <textarea
                  className="input min-h-24 resize-y"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="What the agent produced and how it satisfies the criteria…"
                />
              </div>
              <div>
                <label className="label">Deliverable code / content</label>
                <textarea
                  className="input min-h-32 resize-y font-mono text-xs"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={"def request_password_reset(email):\n    ..."}
                />
              </div>
              <div>
                <label className="label">Evidence</label>
                <textarea
                  className="input min-h-20 resize-y"
                  value={evidenceText}
                  onChange={(e) => setEvidenceText(e.target.value)}
                  placeholder="Test outputs, logs, screenshots, or supporting material…"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Repository URL (optional)</label>
                  <input
                    className="input"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/…"
                  />
                </div>
                <div>
                  <label className="label">Commit SHA / PR (optional)</label>
                  <input
                    className="input font-mono"
                    value={commitSha}
                    onChange={(e) => setCommitSha(e.target.value)}
                    placeholder="abc1234…"
                  />
                </div>
              </div>
              <div>
                <label className="label">Agent name / notes</label>
                <input
                  className="input"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Agent name or notes about the submission"
                />
              </div>
              {error && (
                <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs text-rose-300">
                  {error}
                </p>
              )}
              <button onClick={submit} disabled={submitting} className="btn-primary w-full !py-3">
                {submitting ? "Submitting…" : "SUBMIT FOR VERIFICATION"}
              </button>
            </div>
          )}
        </div>
      )}

      {verification.status === "VERIFYING" && (
        <div className="card mt-10 p-8 text-center">
          <p className="pulse-glow font-mono text-sm text-cyan-300">
            VERIFYING WITH GENLAYER…
          </p>
          <p className="mt-2 text-xs text-slate-500">Run the verification sequence to see the result.</p>
        </div>
      )}

      {/* result link */}
      {decided && (
        <div className="mt-10">
          <Link href={`/verify/${id}`} className="btn-primary">
            VIEW VERIFICATION SEQUENCE & RESULT
          </Link>
        </div>
      )}
    </div>
  );
}