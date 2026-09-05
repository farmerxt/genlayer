import type { Metadata } from "next";
import { CreateForm } from "@/components/CreateForm";

export const metadata: Metadata = {
  title: "Create Verification — AgentzProof",
  description: "Define a task, acceptance criteria, and evidence requirements for AI-agent work verification.",
};

export default function CreatePage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <div className="mb-10">
        <p className="font-mono text-xs text-cyan-400">/create</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
          Create a verification
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Define the agreement. When an agent submits work, AgentzProof verifies
          it against <span className="text-slate-200">these original criteria</span> —
          deterministically where possible, and through GenLayer adjudication
          where judgment is required.
        </p>
      </div>
      <CreateForm />
    </div>
  );
}