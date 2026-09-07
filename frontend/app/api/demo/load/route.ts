import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getDemoScenario } from "@/lib/demo/fixtures";
import type { Verification } from "@/lib/types";
import { verificationStore } from "@/lib/store/verification-store";
import { ValidationError } from "@/lib/verifier/service";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const scenarioId = String(body?.scenarioId ?? "");
    const scenario = getDemoScenario(scenarioId);
    if (!scenario) {
      return NextResponse.json({ error: "Unknown demo scenario" }, { status: 400 });
    }

    const request = await scenario.buildRequest();
    const now = new Date().toISOString();
    const verification: Verification = {
      id: randomUUID(),
      title: request.title,
      description: request.task,
      task: request.task,
      requirements: request.requirements,
      creator: request.metadata.creator,
      agent: request.metadata.agent,
      reward: request.metadata.reward,
      deadline: request.metadata.deadline,
      evidenceRequirements: request.metadata.evidenceRequirements ?? [],
      status: "SUBMITTED",
      deliverable: request.deliverable,
      evidence: request.evidence,
      evidenceUrls: request.evidenceUrls,
      repository: request.repository,
      createdAt: now,
      updatedAt: now,
      demo: true,
    };
    await verificationStore.upsert(verification);

    return NextResponse.json({
      verification: {
        id: verification.id,
        title: verification.title,
        description: verification.description,
        task: verification.task,
        requirements: verification.requirements,
        creator: verification.creator,
        agent: verification.agent,
        status: verification.status,
        demo: true,
        expected: scenario.expected,
        tagline: scenario.tagline,
        createdAt: verification.createdAt,
      },
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("POST /api/demo/load failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}