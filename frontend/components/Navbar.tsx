"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";

const LINKS = [
  { href: "/create", label: "Create" },
  { href: "/jobs", label: "Jobs" },
  { href: "/demo", label: "Agent Simulator" },
  { href: "/about", label: "About" },
];

export function Navbar() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#05060c]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => {
            const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3.5 py-2 text-sm transition-colors ${
                  active
                    ? "bg-white/5 text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/demo"
            className="btn-primary !px-4 !py-2 text-sm"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
              <path d="M6 3l14 9-14 9V3z" fill="currentColor" />
            </svg>
            Live Demo
          </Link>
        </div>
      </div>
      {/* mobile nav */}
      <nav className="flex items-center justify-around border-t border-white/5 px-2 py-1.5 md:hidden">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`px-3 py-1.5 text-xs ${
              pathname === l.href ? "text-cyan-300" : "text-slate-400"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}