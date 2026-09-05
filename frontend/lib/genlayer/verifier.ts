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

export interface GenLayerConfig {
  rpcUrl: string;
  network: string;
  contractAddress: string;
  privateKey?: string;
}

export function getGenLayerConfig(): GenLayerConfig | null {
  const contractAddress = process.env.GENLAYER_CONTRACT_ADDRESS;
  if (!contractAddress) return null;
  return {
    rpcUrl: process.env.GENLAYER_RPC_URL ?? "https://studio.genlayer.com/api",
    network: process.env.GENLAYER_NETWORK ?? "studionet",
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

export async function verifyOnGenLayer(
  verificationId: string,
  request: Parameters<typeof toOnChainRequestJson>[0],
): Promise<{ result: VerificationResult; tx: VerificationResult["tx"] }> {
  const config = getGenLayerConfig();
  if (!config) {
    throw new Error("GenLayer not configured (GENLAYER_CONTRACT_ADDRESS missing)");
  }

  const chain = resolveChain(config.network);
  const client = createClient({
    chain,
    ...(config.rpcUrl && config.rpcUrl !== "https://studio.genlayer.com/api"
      ? { endpoint: config.rpcUrl }
      : {}),
  });

  // Server-side account from private key (never exposed to the client).
  const account = config.privateKey ? createAccount(config.privateKey as `0x${string}`) : undefined;

  const requestJson = toOnChainRequestJson(request);

  const txHash = await client.writeContract({
    ...(account ? { account } : {}),
    address: config.contractAddress as `0x${string}`,
    functionName: "verify",
    args: [verificationId, requestJson],
    value: 0n,
  });

  const receipt = await client.waitForTransactionReceipt({
    hash: txHash,
    status: TransactionStatus.FINALIZED,
    retries: 200,
  });

  if (receipt?.txExecutionResultName === "FINISHED_WITH_ERROR") {
    throw new Error(
      `Contract execution failed: ${JSON.stringify(receipt.txExecutionResultName)}`,
    );
  }

  // Read the stored result back via a view call (accepted state).
  const stored = await client.readContract({
    address: config.contractAddress as `0x${string}`,
    functionName: "get_verification",
    args: [verificationId],
  });

  // The contract may return a JSON string (recommended to avoid GenVM
  // float-serialisation issues) or an object depending on the runtime.
  let storedObj: unknown = stored ?? {};
  if (typeof storedObj === "string") {
    storedObj = storedObj.length > 0 ? JSON.parse(storedObj) : {};
  }
  if (typeof storedObj !== "object" || storedObj === null || Object.keys(storedObj as object).length === 0) {
    throw new Error("Verification not found on-chain after finalization.");
  }

  // Normalize snake_case on-chain result → app result shape.
  const result = normalizeOnChainResult(storedObj as Record<string, unknown>, verificationId);
  validateResultSchema(result);

  return {
    result,
    tx: {
      mode: "genlayer",
      transactionHash: String(txHash),
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
      principle: "strict_eq",
      judge: "genlayer_llm",
    },
    mode: "genlayer",
    verifiedAt: new Date().toISOString(),
  };
}

function buildExplorerUrl(network: string, hash: string): string | undefined {
  const base =
    network === "testnetBradbury"
      ? "https://testnet.bradbury.explorer.genlayer.com"
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