import Link from "next/link";
import { Logo } from "@/components/Logo";

export function Footer() {
  return (
    <footer className="border-t border-white/5 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-5 md:flex-row md:justify-between">
        <div className="flex flex-col items-center gap-2 md:items-start">
          <Logo />
          <p className="max-w-xs text-center text-xs leading-relaxed text-slate-500 md:text-left">
            Proof for the agentic economy. Independent verification of AI-agent
            work, adjudicated by GenLayer Intelligent Contracts.
          </p>
        </div>
        <div className="flex flex-col items-center gap-3 text-sm text-slate-400 md:items-end">
          <div className="flex gap-5">
            <Link href="/create" className="hover:text-white">Create</Link>
            <Link href="/jobs" className="hover:text-white">Jobs</Link>
            <Link href="/demo" className="hover:text-white">Demo</Link>
            <Link href="/about" className="hover:text-white">About</Link>
          </div>
          <span className="font-mono text-xs text-slate-600">
            built for the GenLayer Agent Tank Hackathon 2026
          </span>
        </div>
      </div>
    </footer>
  );
}