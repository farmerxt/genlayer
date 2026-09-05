import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AgentzProof — Proof for the Agentic Economy",
  description:
    "Independent verification for AI-agent work, powered by GenLayer. AI agents can do the work. AgentzProof verifies it.",
  keywords: [
    "agent verification",
    "AI agents",
    "GenLayer",
    "intelligent contracts",
    "decentralized verification",
    "agentic economy",
  ],
  metadataBase: new URL("https://agentzproof.xyz"),
  openGraph: {
    title: "AgentzProof — Proof for the Agentic Economy",
    description:
      "Independent verification for AI-agent work, powered by GenLayer.",
    url: "https://agentzproof.xyz",
    siteName: "AgentzProof",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AgentzProof — Proof for the Agentic Economy",
    description: "Independent verification for AI-agent work, powered by GenLayer.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#05060c",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Navbar />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}