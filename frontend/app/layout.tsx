import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AgentzProof — AI work, independently verified",
  description: "Independent verification of AI-agent deliverables using deterministic checks and GenLayer consensus.",
  keywords: ["agent verification", "AI agents", "GenLayer", "intelligent contracts", "agentic economy"],
  metadataBase: new URL("https://agentzproof.xyz"),
  openGraph: { title: "AgentzProof — AI work, independently verified", description: "AI agents do the work. AgentzProof proves it.", url: "https://agentzproof.xyz", siteName: "AgentzProof", type: "website" },
  twitter: { card: "summary_large_image", title: "AgentzProof — AI work, independently verified", description: "Independent verification of AI-agent deliverables using GenLayer consensus." },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#fbfaf7", colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${geistSans.variable} ${geistMono.variable}` }><Navbar /><main className="min-h-screen">{children}</main><Footer /></body></html>;
}
