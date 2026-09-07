/**
 * LIVE GenLayer verification path.
 *
 * When GENLAYER_* env vars are configured (contract deployed), the app calls
 * the deployed AgentzProofVerifier Intelligent Contract through genlayer-js
 * and reports the real transaction hash / contract address / network. When
 * not configured, the API falls back to demo mode and labels it honestly.
 *
 * Never fabricate transaction hashes — if this module cannot produce a real
 * receipt, the UI shows "Not deployed".
 */

import { createClient, createAccount } from "genlayer-js";
import { localnet, studionet, testnetAsimov, testnetBradbury } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import type { VerificationResult } from "@/lib/types";
import { toOnChainRequestJson } from "@/lib/verifier/serialize";
import { validateResultSchema } from "@/lib/verifier/schema";

type GenLayerTxHash = `0x${string}` & { length: 66 };

export const MAX_GENLAYER_WRITE_ATTEMPTS = 3;
const MIN_CAPACITY_RETRY_DELAY_MS = 100;
const MAX_CAPACITY_RETRY_DELAY_MS = 1_000;
const DEFAULT_CAPACITY_RETRY_DELAY_MS = 300;

export interface GenLayerConfig {
  rpcUrl: string;
  network: string;
  contractAddress: string;
  privateKey?: string;
}

/** A node-capacity rejection that occurred before GenLayer returned a tx hash. */
export class GenLayerCapacityError extends Error {
  readonly retryableWithoutHash = true;

  constructor(message: string) {
    super(message);
    this.name = "GenLayerCapacityError";
  }
}

function errorText(error: unknown): string {
  const seen = new Set<object>();
  const parts: string[] = [];

  function collect(value: unknown): void {
    if (value instanceof Error) {
      parts.push(value.message);
      const candidate = value as Error & { cause?: unknown } & Record<string, unknown>;
      for (const [key, nested] of Object.entries(candidate)) {
        if (key !== "stack" && key !== "message" && key !== "cause") collect(nested);
      }
      collect(candidate.cause);
      return;
    }
    if (typeof value === "string") {
      parts.push(value);
      return;
    }
    if (typeof value !== "object" || value === null || seen.has(value)) return;
    seen.add(value);
    const candidate = value as Record<string, unknown>;
    for (const [key, nested] of Object.entries(candidate)) {
      if (key === "stack") continue;
      if (typeof nested === "string") parts.push(nested);
      else collect(nested);
    }
  }

  collect(error);
  return parts.join(" ") || String(error);
}

function findErrorValues(error: unknown, keys: string[]): unknown[] {
  const values: unknown[] = [];
  const seen = new Set<object>();

  function visit(value: unknown): void {
    if (typeof value !== "object" || value === null || seen.has(value)) return;
    seen.add(value);
    const candidate = value as Record<string, unknown>;
    for (const [key, nested] of Object.entries(candidate)) {
      if (keys.includes(key)) values.push(nested);
      visit(nested);
    }
    if (value instanceof Error) visit((value as Error & { cause?: unknown }).cause);
  }

  visit(error);
  return values;
}

/** Return true only when a hash appears anywhere in an error or nested cause. */
export function hasTransactionHash(error: unknown): boolean {
  const nestedHashes = findErrorValues(error, ["hash", "txHash", "transactionHash"]);
  return (
    nestedHashes.some((value) => typeof value === "string" && value.length > 0) ||
    /0x[0-9a-f]{64}/i.test(errorText(error))
  );
}

function hasErrorCode(error: unknown, code: number): boolean {
  if (findErrorValues(error, ["code"]).some((value) => Number(value) === code)) return true;
  return new RegExp(`(?:\\"?code\\"?|error\\s+code)\\s*[:=]\\s*\\"?${code}\\"?`, "i").test(
    errorText(error),
  );
}

export function getGenLayerCapacityRetryDelay(error: unknown): number {
  const retryAfter = findErrorValues(error, ["retryAfterMs"]).find(
    (value) => typeof value === "number" || (typeof value === "string" && value.trim() !== ""),
  );
  const textualRetryAfter = /[\\\"']?retryAfterMs[\\\"']?\\s*[:=]\\s*[\\\"']?([0-9]+(?:\\.[0-9]+)?)/i.exec(
    errorText(error),
  )?.[1];
  const parsed =
    retryAfter === undefined
      ? textualRetryAfter === undefined
        ? DEFAULT_CAPACITY_RETRY_DELAY_MS
        : Number(textualRetryAfter)
      : Number(retryAfter);
  if (!Number.isFinite(parsed)) return DEFAULT_CAPACITY_RETRY_DELAY_MS;
  return Math.min(MAX_CAPACITY_RETRY_DELAY_MS, Math.max(MIN_CAPACITY_RETRY_DELAY_MS, parsed));
}

/**
 * Bradbury's -32005 response means the node rejected this request before a
 * transaction hash was created. The classifier is deliberately strict so
 * generic rate limits, timeouts, and ambiguous provider failures never retry.
 */
export function isGenLayerCapacityError(error: unknown): boolean {
  if (hasTransactionHash(error) || !hasErrorCode(error, -32005)) return false;
  const text = errorText(error).toLowerCase();
  return (
    text.includes("transaction gas rate limit exceeded") &&
    text.includes("node is at capacity")
  );
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * Submit one write with a bounded retry budget. The callback must represent
 * only the pre-hash write operation; receipt polling begins after this returns.
 */
export async function writeContractWithCapacityRetry(
  write: () => Promise<unknown>,
): Promise<string> {
  let lastCapacityError: unknown;
  for (let attempt = 1; attempt <= MAX_GENLAYER_WRITE_ATTEMPTS; attempt += 1) {
    try {
      const hash = await write();
      // A successful hash ends submission immediately; never issue another
      // write after a transaction identifier has been returned.
      if (typeof hash === "string" && hash.length > 0) return hash;
      throw new Error("GenLayer write did not return a transaction hash; retry is blocked.");
    } catch (error) {
      // A provider may include a hash in a nested cause even while throwing.
      // That makes the outcome ambiguous, so it is never safe to retry.
      if (!isGenLayerCapacityError(error)) throw error;
      lastCapacityError = error;
      if (attempt === MAX_GENLAYER_WRITE_ATTEMPTS) break;
      await sleep(getGenLayerCapacityRetryDelay(error));
    }
  }

  throw new GenLayerCapacityError(errorText(lastCapacityError));
}

const STUDIO_RPC_URL = "https://studio.genlayer.com/api";
const BRADBURY_RPC_URL = "https://rpc-bradbury.genlayer.com";

export function getGenLayerConfig(): GenLayerConfig | null {
  const contractAddress = process.env.GENLAYER_CONTRACT_ADDRESS;
  if (!contractAddress) return null;
  const network = process.env.GENLAYER_NETWORK ?? "studionet";
  const explicitRpc = process.env.GENLAYER_RPC_URL?.trim();
  // testnetBradbury always talks to the official node directly. The studio
  // gateway (the legacy default) routes write transactions but does not
  // implement gen_call, so verification read-backs fail with "Method not
  // found" even though the transaction finalized on-chain.
  const rpcUrl =
    network === "testnetBradbury"
      ? BRADBURY_RPC_URL
      : explicitRpc || STUDIO_RPC_URL;
  return {
    rpcUrl,
    network,
    contractAddress,
    privateKey: process.env.GENLAYER_PRIVATE_KEY,
  };
}

function resolveChain(network: string) {
  switch (network) {
    case "localnet":
      return localnet;
    case "testnetAsimov":
      return testnetAsimov;
    case "testnetBradbury":
      return testnetBradbury;
    case "studionet":
    default:
      return studionet;
  }
}

/**
 * Submit the verification transaction to GenLayer and return only the hash.
 *
 * This is intentionally split from finalization so the serverless function can
 * return quickly (202) once a hash exists, instead of blocking on the network's
 * potentially minutes-long finalization (which exceeds serverless time limits).
 * The client then polls /finalize, which resumes waiting on this same hash.
 */
export async function submitVerificationTransaction(
  verificationId: string,
  request: Parameters<typeof toOnChainRequestJson>[0],
): Promise<string> {
  const config = getGenLayerConfig();
  if (!config) {
    throw new Error("GenLayer not configured (GENLAYER_CONTRACT_ADDRESS missing)");
  }

  const chain = resolveChain(config.network);
  const client = createClient({
    chain,
    ...(config.rpcUrl ? { endpoint: config.rpcUrl } : {}),
  });

  // Server-side account from private key (never exposed to the client).
  const account = config.privateKey ? createAccount(config.privateKey as `0x${string}`) : undefined;

  const requestJson = toOnChainRequestJson(request);

  const txHash = await writeContractWithCapacityRetry(() =>
    client.writeContract({
      ...(account ? { account } : {}),
      address: config.contractAddress as `0x${string}`,
      functionName: "verify",
      args: [verificationId, requestJson],
      value: 0n,
    }),
  );

  if (typeof txHash !== "string" || txHash.length === 0) {
    throw new Error("GenLayer write did not return a transaction hash; retry is blocked.");
  }
  return txHash;
}

/**
 * Wait for an already-submitted transaction to finalize and read the result
 * back from the contract. Resumable: the hash is persisted, so a serverless
 * timeout here does not lose the submission — the next call resumes waiting.
 */
export async function finalizeVerificationTransaction(
  verificationId: string,
  txHash: string,
): Promise<{ result: VerificationResult; tx: VerificationResult["tx"] }> {
  const config = getGenLayerConfig();
  if (!config) {
    throw new Error("GenLayer not configured (GENLAYER_CONTRACT_ADDRESS missing)");
  }

  const chain = resolveChain(config.network);
  const client = createClient({
    chain,
    ...(config.rpcUrl ? { endpoint: config.rpcUrl } : {}),
  });

  const receipt = await client.waitForTransactionReceipt({
    hash: txHash as GenLayerTxHash,
    status: TransactionStatus.FINALIZED,
    retries: 200,
  });

  if (receipt?.txExecutionResultName === "FINISHED_WITH_ERROR") {
    throw new Error(
      `Contract execution failed: ${JSON.stringify(receipt.txExecutionResultName)}`,
    );
  }

  // The `verify` write stores the result on-chain (self.verifications[id]);
  // `get_verification` is a view function that returns it. Read it back with
  // the SDK's readContract (gen_call) — the Bradbury receipt does not carry
  // the contract's return value, and the contract must not be re-invoked.
  const raw = await client.readContract({
    address: config.contractAddress as `0x${string}`,
    functionName: "get_verification",
    args: [verificationId],
  });

  // The contract returns a JSON string (recommended to avoid GenVM
  // float-serialisation issues) or an object depending on the runtime.
  let storedObj: unknown = raw;
  if (typeof storedObj === "string") {
    storedObj = storedObj.length > 0 ? JSON.parse(storedObj) : {};
  }
  if (typeof storedObj !== "object" || storedObj === null || Object.keys(storedObj as object).length === 0) {
    throw new Error(
      "Verification finalized but the contract holds no stored result for this id " +
        "(get_verification returned empty).",
    );
  }

  // Normalize snake_case on-chain result → app result shape.
  const result = normalizeOnChainResult(storedObj as Record<string, unknown>, verificationId);
  validateResultSchema(result);

  return {
    result,
    tx: {
      mode: "genlayer",
      transactionHash: txHash as GenLayerTxHash,
      contractAddress: config.contractAddress,
      network: config.network,
      status: "FINALIZED",
      explorerUrl: buildExplorerUrl(config.network, String(txHash)),
    },
  };
}

export function normalizeOnChainResult(
  r: Record<string, unknown>,
  verificationId: string,
): VerificationResult {
  const requirements = Array.isArray(r.requirements)
    ? (r.requirements as Array<Record<string, unknown>>).map((req) => ({
        id: String(req.id ?? ""),
        requirement: String(req.requirement ?? ""),
        status: req.status === "PASS" ? ("PASS" as const) : ("FAIL" as const),
        checkedBy: req.checked_by === "deterministic" ? ("deterministic" as const) : ("llm" as const),
        reason: String(req.reason ?? ""),
        check: (req.check as VerificationResult["requirements"][number]["check"] | undefined) ?? undefined,
      }))
    : [];
  const evidence = Array.isArray(r.evidence)
    ? (r.evidence as Array<Record<string, unknown>>).map((e) => ({
        source: String(e.source ?? ""),
        claim: String(e.claim ?? ""),
        used: Boolean(e.used),
        fetched: Boolean(e.fetched),
      }))
    : [];
  const onChainConsensus =
    typeof r.consensus === "object" && r.consensus !== null
      ? (r.consensus as Record<string, unknown>)
      : {};

  return {
    verificationId,
    verificationVersion: String(r.verification_version ?? "1.0"),
    decision: r.decision === "PASS" ? ("PASS" as const) : ("FAIL" as const),
    score: typeof r.score === "number" ? r.score : 0,
    requirements,
    evidence,
    summary: String(r.summary ?? ""),
    consensus: {
      method: "equivalence_principle",
      principle: String(onChainConsensus.principle ?? "run_nondet_unsafe"),
      judge: String(onChainConsensus.judge ?? "genlayer_llm"),
      webEvidence: String(onChainConsensus.web_evidence ?? "strict_eq"),
      llmAdjudication: String(
        onChainConsensus.llm_adjudication ?? "leader_fn_validator_fn",
      ),
    },
    mode: "genlayer",
    verifiedAt: new Date().toISOString(),
  };
}

function buildExplorerUrl(network: string, hash: string): string | undefined {
  const base =
    network === "testnetBradbury"
      ? "https://explorer-bradbury.genlayer.com"
      : network === "testnetAsimov"
        ? "https://testnet.asimov.explorer.genlayer.com"
        : network === "studionet"
          ? "https://studio.genlayer.com"
          : undefined;
  return base ? `${base}/tx/${hash}` : undefined;
}

export function genLayerStatusLabel(config: GenLayerConfig | null): {
  configured: boolean;
  network: string;
  contractAddress: string;
} {
  return config
    ? { configured: true, network: config.network, contractAddress: config.contractAddress }
    : { configured: false, network: "not-deployed", contractAddress: "" };
}