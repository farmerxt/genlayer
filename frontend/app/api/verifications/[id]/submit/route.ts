import { NextResponse } from "next/server";
import { submitDeliverable, ValidationError } from "@/lib/verifier/service";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const body = await req.json();
    const verification = await submitDeliverable(id, body ?? {});
    return NextResponse.json({ verification });
  } catch (err) {
    if (err instanceof ValidationError) {
      const status = err.message === "Verification not found." ? 404 : 400;
      return NextResponse.json({ error: err.message }, { status });
    }
    console.error(`POST /api/verifications/${id}/submit failed`, err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}