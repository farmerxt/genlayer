"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";

const LINKS = [
  { href: "/create", label: "Create" },
  { href: "/jobs", label: "Jobs" },
  { href: "/demo", label: "Live Demo" },
  { href: "/about", label: "How it Works" },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return <header className="sticky top-0 z-50 border-b border-[var(--border)]/90 bg-[var(--bg)]/90 backdrop-blur-xl">
    <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between px-5">
      <Logo />
      <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
        {LINKS.map((link) => { const active = pathname === link.href || pathname.startsWith(`${link.href}/`); return <Link key={link.href} href={link.href} className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-[var(--orange-soft)] text-[var(--orange-dark)]" : "text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"}`}>{link.label}</Link>; })}
      </nav>
      <div className="flex items-center gap-2"><Link href="/jobs" className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)] md:inline-flex"><span aria-hidden>⌕</span> Search</Link><Link href="/create" className="btn-primary !min-h-[38px] !px-4 text-sm">Launch App <span aria-hidden>→</span></Link><button type="button" className="btn-secondary !min-h-[38px] !px-3 md:hidden" aria-label="Toggle navigation" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "×" : "☰"}</button></div>
    </div>
    {open && <nav className="border-t border-[var(--border)] bg-white px-5 py-3 md:hidden" aria-label="Mobile navigation">{LINKS.map((link) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--orange-soft)] hover:text-[var(--orange-dark)]">{link.label}</Link>)}<Link href="/jobs" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--orange-soft)] hover:text-[var(--orange-dark)]">Search verifications</Link></nav>}
  </header>;
}
