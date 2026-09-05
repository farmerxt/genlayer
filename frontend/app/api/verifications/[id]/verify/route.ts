import { NextResponse } from "next/server";
import { runVerify, ValidationError, getGenLayerConfig } from "@/lib/verifier/service";

export const runtime = "nodejs";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const { result } = await runVerify(id);
    return NextResponse.json({
      result,
      mode: result.mode,
      genlayer: getGenLayerConfig()
        ? { configured: true, network: result.tx?.network }
        : { configured: false },
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      const status = err.message.startsWith("GenLayer verification failed")
        ? 502
        : err.message === "Verification not found."
          ? 404
          : 400;
      return NextResponse.json({ error: err.message }, { status });
    }
    console.error(`POST /api/verifications/${id}/verify failed`, err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}