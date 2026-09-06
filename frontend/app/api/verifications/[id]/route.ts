import { NextResponse } from "next/server";
import { verificationStore } from "@/lib/store/verification-store";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const verification = await verificationStore.get(id);
  if (!verification) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ verification });
}