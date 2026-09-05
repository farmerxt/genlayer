import Link from "next/link";

export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const textSize = size === "lg" ? "text-2xl" : "text-lg";
  const iconSize = size === "lg" ? "h-9 w-9" : "h-7 w-7";
  return (
    <Link href="/" className="group inline-flex items-center gap-2.5 select-none">
      <span
        className={`${iconSize} relative grid place-items-center rounded-lg border border-cyan-400/30 bg-gradient-to-br from-cyan-500/20 to-violet-600/20`}
      >
        {/* verification check mark */}
        <svg viewBox="0 0 24 24" fill="none" className="h-1/2 w-1/2 text-cyan-300">
          <path
            d="M5 13l4 4L19 7"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="absolute inset-0 rounded-lg ring-1 ring-white/5" />
      </span>
      <span className={`${textSize} font-bold tracking-tight leading-none`}>
        <span className="text-white">AGENTZ</span>
        <span className="gradient-text">PROOF</span>
      </span>
    </Link>
  );
}