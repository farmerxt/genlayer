/**
 * Shared types for the AgentzProof verification domain.
 * The request/result shapes mirror the on-chain contract exactly
 * (contracts/AgentzProofVerifier.py).
 */

export type VerificationStatus =
  | "OPEN"
  | "SUBMITTED"
  | "VERIFYING"
  | "PASSED"
  | "FAILED";

export type CheckType =
  | "string_present"
  | "regex"
  | "function_exists"
  | "file_exists"
  | "reported"
  | "http_status";

export interface CheckSpec {
  type: CheckType;
  needle?: string;
  pattern?: string;
  name?: string;
  path?: string;
  passed?: boolean;
  evidence?: string;
  url?: string;
  expect?: number;
}

export interface RequirementSpec {
  id: string;
  text: string;
  check?: CheckSpec;
}

export interface Deliverable {
  summary: string;
  code: string;
  files: Record<string, string>;
}

export interface EvidenceItem {
  source: string;
  claim: string;
  content?: string;
}

export interface RepositoryRef {
  url?: string;
  commitSha?: string;
}

export interface VerificationMetadata {
  creator: string;
  agent: string;
  submittedAt: string;
  reward?: string;
  deadline?: string;
  evidenceRequirements?: string[];
}

export interface VerificationRequest {
  version: string;
  title: string;
  task: string;
  requirements: RequirementSpec[];
  deliverable: Deliverable;
  evidence: EvidenceItem[];
  evidenceUrls: string[];
  repository?: RepositoryRef;
  metadata: VerificationMetadata;
}

export interface RequirementResult {
  id: string;
  requirement: string;
  status: "PASS" | "FAIL";
  checkedBy: "deterministic" | "llm";
  reason: string;
  check?: CheckSpec & { detail?: string };
}

export interface EvidenceResult {
  source: string;
  claim: string;
  used: boolean;
  fetched: boolean;
}

export interface ConsensusInfo {
  method: string;
  principle: string;
  judge: string;
}

export interface GenLayerTxInfo {
  mode: "genlayer";
  transactionHash: string;
  contractAddress: string;
  network: string;
  status: string;
  explorerUrl?: string;
}

export interface VerificationResult {
  verificationId: string;
  verificationVersion: string;
  decision: "PASS" | "FAIL";
  score: number;
  requirements: RequirementResult[];
  evidence: EvidenceResult[];
  summary: string;
  consensus: ConsensusInfo;
  mode: "demo" | "genlayer";
  tx?: GenLayerTxInfo;
  verifiedAt: string;
}

export interface Verification {
  id: string;
  title: string;
  description: string;
  task: string;
  requirements: RequirementSpec[];
  creator: string;
  agent: string;
  reward?: string;
  deadline?: string;
  evidenceRequirements: string[];
  status: VerificationStatus;
  deliverable?: Deliverable;
  evidence: EvidenceItem[];
  evidenceUrls: string[];
  repository?: RepositoryRef;
  result?: VerificationResult;
  createdAt: string;
  updatedAt: string;
  demo?: boolean;
}

export interface VerificationSummary {
  id: string;
  title: string;
  status: VerificationStatus;
  creator: string;
  agent: string;
  requirementCount: number;
  decision?: "PASS" | "FAIL";
  score?: number;
  createdAt: string;
  demo?: boolean;
}