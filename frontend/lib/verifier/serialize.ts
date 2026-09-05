/**
 * Serializes the app's VerificationRequest (camelCase) into the exact JSON
 * schema the on-chain contract expects (snake_case: evidence_urls,
 * commit_sha, submitted_at). Keep in sync with contracts/AgentzProofVerifier.py.
 */

import type { VerificationRequest } from "@/lib/types";

export function toOnChainRequestJson(request: VerificationRequest): string {
  const onChain = {
    version: request.version ?? "1.0",
    title: request.title ?? "",
    task: request.task ?? "",
    requirements: (request.requirements ?? []).map((r) => ({
      id: r.id,
      text: r.text,
      check: r.check ?? undefined,
    })),
    deliverable: {
      summary: request.deliverable?.summary ?? "",
      code: request.deliverable?.code ?? "",
      files: request.deliverable?.files ?? {},
    },
    evidence: (request.evidence ?? []).map((e) => ({
      source: e.source ?? "",
      claim: e.claim ?? "",
      content: e.content ?? "",
    })),
    evidence_urls: request.evidenceUrls ?? [],
    repository: request.repository
      ? {
          url: request.repository.url ?? "",
          commit_sha: request.repository.commitSha ?? "",
        }
      : undefined,
    metadata: {
      creator: request.metadata?.creator ?? "",
      agent: request.metadata?.agent ?? "",
      submitted_at: request.metadata?.submittedAt ?? new Date().toISOString(),
      reward: request.metadata?.reward ?? "",
      deadline: request.metadata?.deadline ?? "",
    },
  };
  return JSON.stringify(onChain);
}