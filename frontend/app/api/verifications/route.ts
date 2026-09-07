import { NextResponse } from "next/server";
import type { VerificationSummary } from "@/lib/types";
import { verificationStore } from "@/lib/store/verification-store";
import { createVerification, ValidationError } from "@/lib/verifier/service";

export const runtime = "nodejs";

export async function GET() {
  const verifications = await verificationStore.list();
  const summaries: VerificationSummary[] = verifications.map((v) => ({
    id: v.id,
    title: v.title,
    status: v.status,
    creator: v.creator,
    agent: v.agent,
    requirementCount: v.requirements.length,
    decision: v.result?.decision,
    score: v.result?.score,
    createdAt: v.createdAt,
    demo: v.demo,
  }));
  return NextResponse.json({ verifications: summaries });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const verification = await createVerification(body ?? {});
    return NextResponse.json({ verification }, { status: 201 });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("POST /api/verifications failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}