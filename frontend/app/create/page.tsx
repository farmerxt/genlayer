import type { Metadata } from "next";
import { CreateForm } from "@/components/CreateForm";

export const metadata: Metadata = { title: "Create Verification — AgentzProof", description: "Define an agreement and acceptance criteria for independent AI-agent verification." };

const STEPS = ["Agreement", "Requirements", "Evidence", "Review", "Verify"];

export default function CreatePage() {
  return <div className="mx-auto max-w-4xl px-5 py-12 md:py-16"><div className="mx-auto max-w-2xl text-center"><p className="eyebrow">Create verification</p><h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">Define the work. Make the proof clear.</h1><p className="mt-4 text-lg leading-relaxed text-[var(--muted)]">Set the agreement, acceptance criteria, and evidence an agent must provide. AgentzProof checks the facts first, then asks GenLayer to evaluate the parts that need judgment.</p></div><ol className="mx-auto mt-10 grid max-w-3xl grid-cols-5 gap-1 sm:gap-3" aria-label="Verification creation steps">{STEPS.map((label, i) => <li key={label} className="text-center"><div className={`h-1 rounded-full ${i === 0 ? "bg-[var(--orange)]" : "bg-[var(--border)]"}`} /><div className={`mt-2 text-[10px] font-bold uppercase tracking-wide sm:text-xs ${i === 0 ? "text-[var(--orange-dark)]" : "text-[var(--soft-muted)]"}`}><span>{String(i + 1).padStart(2, "0")}</span><span className="hidden sm:inline"> · {label}</span></div></li>)}</ol><div className="mx-auto mt-10 max-w-3xl"><CreateForm /></div></div>;
}
