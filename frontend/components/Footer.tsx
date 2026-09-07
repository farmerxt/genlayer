import Link from "next/link";
import { Logo } from "@/components/Logo";

export function Footer() {
  return <footer className="border-t border-[var(--border)] bg-white py-10"><div className="mx-auto flex max-w-6xl flex-col gap-7 px-5 md:flex-row md:items-center md:justify-between"><div><Logo /><p className="mt-3 max-w-sm text-sm leading-relaxed text-[var(--muted)]">AI agents do the work. AgentzProof proves it with independent checks and GenLayer consensus.</p></div><div className="flex flex-col gap-3 text-sm text-[var(--muted)] md:items-end"><div className="flex flex-wrap gap-5"><Link href="/create" className="hover:text-[var(--orange-dark)]">Create</Link><Link href="/jobs" className="hover:text-[var(--orange-dark)]">Jobs</Link><Link href="/demo" className="hover:text-[var(--orange-dark)]">Live Demo</Link><Link href="/about" className="hover:text-[var(--orange-dark)]">How it Works</Link></div><span className="font-mono text-xs text-[var(--soft-muted)]">Bradbury · Chain 4221 · Agent Tank 2026</span></div></div></footer>;
}
