import { NextResponse } from "next/server";
import { startVerify, runDemoVerify, ValidationError, getGenLayerConfig } from "@/lib/verifier/service";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const body = await req.json().catch(() => ({}));
    const genConfig = getGenLayerConfig();

    if (!genConfig) {
      // Demo mode: local engine is fast, run synchronously and return the result.
      const { result } = await runDemoVerify(id, body?.verification);
      return NextResponse.json({ result, mode: "demo", genlayer: { configured: false } });
    }

    // Live mode: submit the transaction and return immediately (202). The
    // client polls /finalize to resume waiting on the persisted hash. This
    // avoids blocking a serverless request on GenLayer's slow finalization.
    const { transactionHash } = await startVerify(id, body?.verification);
    return NextResponse.json(
      { status: "VERIFYING", transactionHash, mode: "genlayer", genlayer: { configured: true, network: genConfig.network } },
      { status: 202 },
    );
  } catch (err) {
    if (err instanceof ValidationError) {
      const status = err.message.startsWith("GenLayer verification failed")
        ? 502
        : err.message === "Verification not found."
          ? 404
          : err.message === "GenLayer is temporarily at capacity. No proof was submitted. Please retry."
            ? 503
            : 400;
      return NextResponse.json({ error: err.message }, { status });
    }
    console.error(`POST /api/verifications/${id}/verify failed`, err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}