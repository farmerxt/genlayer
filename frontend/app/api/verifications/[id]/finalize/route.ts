import { NextResponse } from "next/server";
import { finalizeVerify, ValidationError, getGenLayerConfig } from "@/lib/verifier/service";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Finalize an already-submitted live verification by resuming receipt waiting
 * on the persisted transaction hash. Never submits a transaction, so it is
 * safe to poll repeatedly — a serverless timeout just means the next call
 * resumes waiting on the same hash.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const { result, verification } = await finalizeVerify(id);
    return NextResponse.json({
      result,
      verification: { id: verification.id, status: verification.status },
      mode: result.mode,
      genlayer: getGenLayerConfig()
        ? { configured: true, network: result.tx?.network }
        : { configured: false },
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      const status = err.message === "Verification not found."
        ? 404
        : err.message === "Verification has not been submitted."
          ? 409
          : err.message.startsWith("GenLayer verification failed")
            ? 502
            : 400;
      return NextResponse.json({ error: err.message }, { status });
    }
    console.error(`POST /api/verifications/${id}/finalize failed`, err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}