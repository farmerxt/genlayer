import Link from "next/link";

export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const textSize = size === "lg" ? "text-2xl" : "text-lg";
  const iconSize = size === "lg" ? "h-9 w-9" : "h-7 w-7";
  return <Link href="/" className="group inline-flex select-none items-center gap-2.5" aria-label="AgentzProof home">
    <span className={`${iconSize} relative grid place-items-center rounded-[10px] bg-[#ff6b35] text-white shadow-[0_5px_12px_rgba(255,107,53,.22)]`}>
      <svg viewBox="0 0 24 24" fill="none" className="h-1/2 w-1/2"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </span>
    <span className={`${textSize} font-bold leading-none tracking-tight`}><span className="text-[#202124]">Agentz</span><span className="text-[#ff6b35]">Proof</span></span>
  </Link>;
}
