/**
 * Verification service — the layer between API routes and the engines.
 *
 *   Frontend → API → Verification Service → (Demo engine | GenLayer contract)
 *
 * All submitted content is treated as untrusted: payload sizes are capped,
 * URLs validated, schemas checked, and instructions are never derived from
 * submitted content.
 */

import { randomUUID } from "node:crypto";
import type {
  Deliverable,
  EvidenceItem,
  RepositoryRef,
  RequirementSpec,
  Verification,
  VerificationResult,
} from "@/lib/types";
import { verificationStore } from "@/lib/store/verification-store";
import { runVerificationEngine } from "@/lib/verifier/engine";
import { validateResultSchema } from "@/lib/verifier/schema";
import {
  GenLayerCapacityError,
  finalizeVerificationTransaction,
  getGenLayerConfig,
  submitVerificationTransaction,
} from "@/lib/genlayer/verifier";

// ---------------------------------------------------------------------------
// Limits (mirror the contract's caps)
// ---------------------------------------------------------------------------
const MAX_TITLE = 200;
const MAX_DESCRIPTION = 4_000;
const MAX_TASK = 4_000;
const MAX_REQUIREMENTS = 30;
const MAX_REQUIREMENT_TEXT = 500;
const MAX_CODE_CHARS = 120_000;
const MAX_SUMMARY_CHARS = 20_000;
const MAX_EVIDENCE_ITEMS = 20;
const MAX_EVIDENCE_URLS = 5;
const MAX_EVIDENCE_CONTENT = 5_000;
const MAX_FILES = 50;

export class ValidationError extends Error {}

// ---------------------------------------------------------------------------
// Input sanitization / validation
// ---------------------------------------------------------------------------
function clampStr(value: unknown, max: number): string {
  if (value === undefined || value === null) return "";
  return String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").slice(0, max);
}

function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function sanitizeRequirements(value: unknown): RequirementSpec[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ValidationError("At least one acceptance criterion is required.");
  }
  if (value.length > MAX_REQUIREMENTS) {
    throw new ValidationError(`Too many criteria (max ${MAX_REQUIREMENTS}).`);
  }
  return value.map((r, i) => {
    const req = (r ?? {}) as Record<string, unknown>;
    const text = clampStr(req.text, MAX_REQUIREMENT_TEXT);
    if (!text) {
      throw new ValidationError(`Criterion ${i + 1} is missing text.`);
    }
    const id = clampStr(req.id, 64) || `REQ-${i + 1}`;
    const check = (req.check ?? undefined) as RequirementSpec["check"] | undefined;
    if (check !== undefined) {
      if (typeof check !== "object" || !("type" in check)) {
        throw new ValidationError(`Criterion ${id} has an invalid check.`);
      }
      const type = check.type as string;
      const allowed = ["string_present", "regex", "function_exists", "file_exists", "reported", "http_status"];
      if (!allowed.includes(type)) {
        throw new ValidationError(`Criterion ${id} uses unknown check type "${type}".`);
      }
    }
    return { id, text, check };
  });
}

export function sanitizeDeliverable(value: unknown): Deliverable {
  const d = (value ?? {}) as Record<string, unknown>;
  const filesIn = (d.files ?? {}) as Record<string, unknown>;
  const files: Record<string, string> = {};
  for (const [p, c] of Object.entries(filesIn).slice(0, MAX_FILES)) {
    if (typeof c === "string") files[clampStr(p, 200)] = c.slice(0, MAX_CODE_CHARS);
  }
  return {
    summary: clampStr(d.summary, MAX_SUMMARY_CHARS),
    code: clampStr(d.code, MAX_CODE_CHARS),
    files,
  };
}

export function sanitizeEvidence(value: unknown): { items: EvidenceItem[]; urls: string[] } {
  const raw = Array.isArray(value) ? value : [];
  const items: EvidenceItem[] = [];
  for (const e of raw.slice(0, MAX_EVIDENCE_ITEMS)) {
    const ev = (e ?? {}) as Record<string, unknown>;
    items.push({
      source: clampStr(ev.source, 300),
      claim: clampStr(ev.claim, 500),
      content: clampStr(ev.content, MAX_EVIDENCE_CONTENT),
    });
  }
  return { items, urls: [] };
}

export function sanitizeEvidenceUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const u of value) {
    if (typeof u !== "string") continue;
    const trimmed = u.trim().slice(0, 2_000);
    if (isValidHttpUrl(trimmed) && out.length < MAX_EVIDENCE_URLS) out.push(trimmed);
  }
  return out;
}

export function sanitizeRepository(value: unknown): RepositoryRef | undefined {
  const r = (value ?? {}) as Record<string, unknown>;
  const url = clampStr(r.url, 500);
  if (!url) return undefined;
  return { url, commitSha: clampStr(r.commitSha, 128) || undefined };
}

// ---------------------------------------------------------------------------
// Service operations
// ---------------------------------------------------------------------------
export async function createVerification(input: Record<string, unknown>): Promise<Verification> {
  const title = clampStr(input.title, MAX_TITLE);
  if (!title) throw new ValidationError("Task name is required.");

  const now = new Date().toISOString();
  const verification: Verification = {
    id: randomUUID(),
    title,
    description: clampStr(input.description, MAX_DESCRIPTION),
    task: clampStr(input.task, MAX_TASK),
    requirements: sanitizeRequirements(input.requirements),
    creator: clampStr(input.creator, 200) || "Anonymous",
    agent: clampStr(input.agent, 200) || "—",
    reward: clampStr(input.reward, 100) || undefined,
    deadline: clampStr(input.deadline, 100) || undefined,
    evidenceRequirements: Array.isArray(input.evidenceRequirements)
      ? input.evidenceRequirements.map((e) => clampStr(e, 300)).filter(Boolean).slice(0, 10)
      : [],
    status: "OPEN",
    evidence: [],
    evidenceUrls: [],
    createdAt: now,
    updatedAt: now,
  };
  return verificationStore.create(verification);
}

export async function restoreVerification(
  id: string,
  value: unknown,
  allowedStatuses: Verification["status"][],
): Promise<Verification | undefined> {
  if (!value || typeof value !== "object") return undefined;
  const source = value as Record<string, unknown>;
  if (clampStr(source.id, 200) !== id) return undefined;
  const status = clampStr(source.status, 32) as Verification["status"];
  if (!allowedStatuses.includes(status)) return undefined;

  try {
    const now = new Date().toISOString();
    const evidence = sanitizeEvidence(source.evidence);
    const restored: Verification = {
      id,
      title: clampStr(source.title, MAX_TITLE),
      description: clampStr(source.description, MAX_DESCRIPTION),
      task: clampStr(source.task, MAX_TASK),
      requirements: sanitizeRequirements(source.requirements),
      creator: clampStr(source.creator, 200) || "Anonymous",
      agent: clampStr(source.agent, 200) || "—",
      reward: clampStr(source.reward, 100) || undefined,
      deadline: clampStr(source.deadline, 100) || undefined,
      evidenceRequirements: Array.isArray(source.evidenceRequirements)
        ? source.evidenceRequirements.map((item) => clampStr(item, 300)).filter(Boolean).slice(0, 10)
        : [],
      status,
      deliverable: source.deliverable ? sanitizeDeliverable(source.deliverable) : undefined,
      evidence: evidence.items,
      evidenceUrls: sanitizeEvidenceUrls(source.evidenceUrls),
      repository: sanitizeRepository(source.repository),
      createdAt: clampStr(source.createdAt, 64) || now,
      updatedAt: clampStr(source.updatedAt, 64) || now,
      demo: source.demo === true,
    };
    if (!restored.title) return undefined;
    return verificationStore.upsert(restored);
  } catch {
    return undefined;
  }
}

export async function submitDeliverable(
  id: string,
  input: Record<string, unknown>,
): Promise<Verification> {
  const verification = (await verificationStore.get(id)) ?? (await restoreVerification(id, input.verification, ["OPEN"]));
  if (!verification) throw new ValidationError("Verification not found.");
  if (verification.status === "PASSED" || verification.status === "FAILED") {
    throw new ValidationError("Verification already decided.");
  }

  const { items } = sanitizeEvidence(input.evidence);
  const updated = await verificationStore.update(id, {
    agent: clampStr(input.agent, 200) || verification.agent,
    deliverable: sanitizeDeliverable(input.deliverable),
    evidence: items,
    evidenceUrls: sanitizeEvidenceUrls(input.evidenceUrls),
    repository: sanitizeRepository(input.repository) ?? verification.repository,
    status: "SUBMITTED",
  });
  if (!updated) throw new ValidationError("Verification not found.");
  return updated;
}

function buildVerificationRequest(verification: Verification) {
  return {
    version: "1.0",
    title: verification.title,
    task: verification.task || verification.description,
    requirements: verification.requirements,
    deliverable: verification.deliverable as Deliverable,
    evidence: verification.evidence,
    evidenceUrls: verification.evidenceUrls,
    repository: verification.repository,
    metadata: {
      creator: verification.creator,
      agent: verification.agent,
      submittedAt: verification.updatedAt,
      reward: verification.reward,
      deadline: verification.deadline,
    },
  };
}

/**
 * Start a live GenLayer verification: submit the transaction, persist its
 * hash, and return immediately. The serverless request must not block on
 * finalization (that exceeds serverless time limits); the client then polls
 * finalizeVerify() to resume waiting on the same hash.
 */
export async function startVerify(
  id: string,
  snapshot?: unknown,
): Promise<{ verification: Verification; transactionHash?: string }> {
  const verification = (await verificationStore.get(id)) ?? (await restoreVerification(id, snapshot, ["SUBMITTED"]));
  if (!verification) throw new ValidationError("Verification not found.");
  if (!verification.deliverable) {
    throw new ValidationError("No deliverable submitted yet.");
  }
  if (!getGenLayerConfig()) {
    throw new ValidationError("GenLayer is not configured for live verification.");
  }

  // Idempotent: a verification already submitted must never be re-submitted.
  if (verification.status === "VERIFYING") {
    if (verification.txHash) {
      return { verification, transactionHash: verification.txHash };
    }
    throw new ValidationError(
      "This verification is already in progress but has no recorded transaction hash. " +
        "Inspect the GenLayer account/network before retrying; refusing to resubmit.",
    );
  }

  const request = buildVerificationRequest(verification);
  await verificationStore.update(id, { status: "VERIFYING" });

  try {
    const txHash = await submitVerificationTransaction(id, request);
    const updated = await verificationStore.update(id, { txHash });
    if (!updated) throw new ValidationError("Verification not found.");
    return { verification: updated, transactionHash: txHash };
  } catch (err) {
    // The capacity error is thrown only for a confirmed pre-hash rejection.
    // Reset only this case to the manual retry state; never retry or reset
    // after a hash has been returned.
    if (err instanceof GenLayerCapacityError) {
      await verificationStore.update(id, { status: "SUBMITTED" });
      throw new ValidationError(
        "GenLayer is temporarily at capacity. No proof was submitted. Please retry.",
      );
    }

    // Other live failures keep the VERIFYING state because their transaction
    // lifecycle is unknown and must not be retried blindly.
    throw new ValidationError(
      `GenLayer verification failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/**
 * Wait for an already-submitted verification transaction to finalize and
 * persist the result. Safe to call repeatedly: it never submits a transaction.
 */
export async function finalizeVerify(
  id: string,
): Promise<{ verification: Verification; result: VerificationResult }> {
  const verification = await verificationStore.get(id);
  if (!verification) throw new ValidationError("Verification not found.");

  if ((verification.status === "PASSED" || verification.status === "FAILED") && verification.result) {
    return { verification, result: verification.result };
  }
  if (!verification.txHash) {
    throw new ValidationError("Verification has not been submitted.");
  }

  try {
    const live = await finalizeVerificationTransaction(id, verification.txHash);
    const result = live.result;
    if (live.tx) result.tx = live.tx;
    validateResultSchema(result);
    const status = result.decision === "PASS" ? "PASSED" : "FAILED";
    const updated = await verificationStore.update(id, { status, result });
    if (!updated) throw new ValidationError("Verification not found.");
    return { verification: updated, result };
  } catch (err) {
    throw new ValidationError(
      `GenLayer verification failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/** Synchronous demo-mode verification (fast, local, no blockchain). */
export async function runDemoVerify(
  id: string,
  snapshot?: unknown,
): Promise<{ verification: Verification; result: VerificationResult }> {
  const verification = (await verificationStore.get(id)) ?? (await restoreVerification(id, snapshot, ["SUBMITTED"]));
  if (!verification) throw new ValidationError("Verification not found.");
  if (!verification.deliverable) {
    throw new ValidationError("No deliverable submitted yet.");
  }

  await verificationStore.update(id, { status: "VERIFYING" });
  const request = buildVerificationRequest(verification);
  const result = await runVerificationEngine(request, { verificationId: id, mode: "demo" });
  validateResultSchema(result);
  const status = result.decision === "PASS" ? "PASSED" : "FAILED";
  const updated = await verificationStore.update(id, { status, result });
  if (!updated) throw new ValidationError("Verification not found.");
  return { verification: updated, result };
}

export { getGenLayerConfig };