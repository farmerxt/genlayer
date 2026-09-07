/**
 * One-time browser-wallet deployment utility for AgentzProofVerifier.
 *
 * This module is intentionally not imported by the production app. Load it in
 * a browser-capable TypeScript environment and explicitly call
 * `window.deployAgentzProof()` (or the exported function).
 *
 * No wallet API is called while this module is imported. Deployment state is
 * kept in localStorage so reloads resume a known transaction and never submit
 * a second deployment automatically.
 */

import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { ExecutionResult, TransactionStatus } from "genlayer-js/types";
import type { DecodedDeployData, TransactionHash } from "genlayer-js/types";

type Eip1193Provider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

type DeploymentReceipt = {
  statusName?: TransactionStatus;
  txExecutionResultName?: ExecutionResult;
  txDataDecoded?: DecodedDeployData;
  data?: Record<string, unknown>;
};

type DeploymentState =
  | {
      status: "SUBMITTING";
      wallet: string;
      startedAt: string;
    }
  | {
      status: "PENDING";
      transactionHash: TransactionHash;
      wallet: string;
      submittedAt: string;
    }
  | {
      status: "SUCCESS";
      transactionHash: TransactionHash;
      contractAddress: string;
      wallet: string;
      finalizedAt: string;
      statusName: TransactionStatus.FINALIZED;
      executionResult: ExecutionResult.FINISHED_WITH_RETURN;
      explorerUrl: string;
    }
  | {
      status: "FAILED";
      transactionHash?: TransactionHash;
      wallet: string;
      failedAt: string;
      statusName?: string;
      executionResult?: string;
      error: string;
    }
  | {
      status: "RECOVERED";
      wallet: string;
      startedAt: string;
      recoveredAt: string;
      reason: "manual recovery after provider submission failed before transaction hash";
      recoveryAudit: {
        previousStatus: "SUBMITTING";
        wallet: string;
        startedAt: string;
        recoveryTimestamp: string;
        reason: "manual recovery after provider submission failed before transaction hash";
      };
    };

export type RecoveryResult = {
  status: "RECOVERED";
  wallet: string;
  startedAt: string;
  recoveryTimestamp: string;
  reason: "manual recovery after provider submission failed before transaction hash";
};

export type DeploymentResult = {
  network: string;
  chainId: number;
  wallet: string;
  deploymentTx: string;
  contractAddress: string;
  status: string;
  executionResult: string;
  explorerUrl: string;
};

const EXPECTED_CHAIN_ID = "0x107d";
const EXPECTED_CHAIN_NUMBER = 4221;
const DEPLOYMENT_STATE_STORAGE_KEY = "agentzproof.bradbury.deploymentState";
const LEGACY_TX_STORAGE_KEY = "agentzproof.bradbury.deploymentTx";
const RECOVERY_REASON =
  "manual recovery after provider submission failed before transaction hash" as const;
const CONTRACT_CODE_URL = "/contracts/AgentzProofVerifier.py";

function getProvider(): Eip1193Provider {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("A browser EIP-1193 wallet provider is required.");
  }
  return window.ethereum as unknown as Eip1193Provider;
}

function requireAddress(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error(`${fieldName} was not a valid address: ${String(value)}`);
  }
  return value;
}

function requireTransactionHash(value: unknown): TransactionHash {
  if (typeof value !== "string" || !/^0x[a-fA-F0-9]{64}$/.test(value)) {
    throw new Error(`GenLayer returned an invalid deployment transaction hash: ${String(value)}`);
  }
  return value as TransactionHash;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function saveDeploymentState(state: DeploymentState): void {
  window.localStorage.setItem(DEPLOYMENT_STATE_STORAGE_KEY, JSON.stringify(state));
}

function parseStoredState(): DeploymentState | null {
  const storedState = window.localStorage.getItem(DEPLOYMENT_STATE_STORAGE_KEY);
  if (!storedState) return null;
  try {
    return JSON.parse(storedState) as DeploymentState;
  } catch (error) {
    throw new Error(`Stored deployment state is invalid: ${errorMessage(error)}`);
  }
}

function loadDeploymentState(): DeploymentState | null {
  const state = parseStoredState();
  if (state) return state;

  // Migrate the earlier hash-only format safely as PENDING. It must be tracked,
  // never redeployed, until the network reports its final outcome.
  const legacyHash = window.localStorage.getItem(LEGACY_TX_STORAGE_KEY);
  if (legacyHash) {
    const migratedState: DeploymentState = {
      status: "PENDING",
      transactionHash: requireTransactionHash(legacyHash),
      wallet: "unknown",
      submittedAt: new Date().toISOString(),
    };
    saveDeploymentState(migratedState);
    return migratedState;
  }

  return null;
}

/**
 * Manually recover only a stale SUBMITTING state with no transaction hash.
 *
 * This function has no provider access and no deployment capability. It keeps
 * an audit record as RECOVERED rather than deleting the stale state. A later
 * explicit call to deployAgentzProof may then begin a new deployment attempt.
 */
export function recoverInterruptedDeployment(): RecoveryResult {
  if (typeof window === "undefined") {
    throw new Error("Manual deployment recovery requires a browser.");
  }

  const rawState = window.localStorage.getItem(DEPLOYMENT_STATE_STORAGE_KEY);
  if (!rawState) {
    throw new Error("No persisted deployment state exists.");
  }

  let parsedState: Record<string, unknown>;
  try {
    const value: unknown = JSON.parse(rawState);
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new Error("state is not an object");
    }
    parsedState = value as Record<string, unknown>;
  } catch (error) {
    throw new Error(`Stored deployment state is invalid: ${errorMessage(error)}`);
  }

  if (parsedState.status !== "SUBMITTING") {
    throw new Error(
      `Manual recovery is only allowed for SUBMITTING state; current state is ${String(parsedState.status)}.`,
    );
  }
  if (Object.prototype.hasOwnProperty.call(parsedState, "transactionHash")) {
    throw new Error("Refusing recovery because the SUBMITTING state contains a transaction hash.");
  }

  const wallet = requireAddress(parsedState.wallet, "stored wallet");
  const startedAt = parsedState.startedAt;
  if (typeof startedAt !== "string" || !startedAt) {
    throw new Error("SUBMITTING state has no valid startedAt timestamp.");
  }

  console.log("Manual deployment recovery");
  console.log("Current state: SUBMITTING");
  console.log(`Wallet: ${wallet}`);
  console.log(`Started at: ${startedAt}`);
  console.log(`Reason: ${RECOVERY_REASON}`);

  if (
    !window.confirm(
      "Clear this stale SUBMITTING state? Confirm only if the provider failed before returning a transaction hash.",
    )
  ) {
    throw new Error("Manual recovery cancelled by the user.");
  }

  const recoveryTimestamp = new Date().toISOString();
  saveDeploymentState({
    status: "RECOVERED",
    wallet,
    startedAt,
    recoveredAt: recoveryTimestamp,
    reason: RECOVERY_REASON,
    recoveryAudit: {
      previousStatus: "SUBMITTING",
      wallet,
      startedAt,
      recoveryTimestamp,
      reason: RECOVERY_REASON,
    },
  });

  return {
    status: "RECOVERED",
    wallet,
    startedAt,
    recoveryTimestamp,
    reason: RECOVERY_REASON,
  };
}

function getContractAddress(receipt: DeploymentReceipt): string {
  const decodedAddress = receipt.txDataDecoded?.contractAddress;
  const dataAddress = receipt.data?.contract_address;
  return requireAddress(decodedAddress ?? dataAddress, "contract address");
}

async function loadContractCode(): Promise<Uint8Array> {
  const response = await fetch(CONTRACT_CODE_URL);
  if (!response.ok) {
    throw new Error(`Unable to load AgentzProofVerifier.py: HTTP ${response.status}`);
  }
  const source = await response.text();
  if (!source.trim()) {
    throw new Error("AgentzProofVerifier.py is empty.");
  }
  return new TextEncoder().encode(source);
}

function printDeploymentSummary(result: DeploymentResult): void {
  console.log("NETWORK", result.network);
  console.log("CHAIN_ID", result.chainId);
  console.log("WALLET", result.wallet);
  console.log("DEPLOYMENT_TX", result.deploymentTx);
  console.log("CONTRACT_ADDRESS", result.contractAddress);
  console.log("STATUS", result.status);
  console.log("EXECUTION_RESULT", result.executionResult);
  console.log("EXPLORER_URL", result.explorerUrl);
}

async function trackDeployment(
  client: ReturnType<typeof createClient>,
  wallet: string,
  deploymentTx: TransactionHash,
): Promise<DeploymentResult> {
  console.log("DEPLOYMENT_TX", deploymentTx);

  let receipt: DeploymentReceipt;
  try {
    receipt = (await client.waitForTransactionReceipt({
      hash: deploymentTx,
      status: TransactionStatus.FINALIZED,
      retries: 200,
    })) as DeploymentReceipt;
  } catch (error) {
    // A timeout or RPC error is not proof of failure. Keep PENDING so the next
    // explicit invocation resumes this same hash instead of deploying again.
    throw new Error(`Unable to finalize deployment ${deploymentTx}: ${errorMessage(error)}`);
  }

  if (receipt.statusName !== TransactionStatus.FINALIZED) {
    throw new Error(`Deployment did not finalize. Status: ${String(receipt.statusName)}`);
  }

  if (receipt.txExecutionResultName !== ExecutionResult.FINISHED_WITH_RETURN) {
    const failure = `Deployment finalized without successful execution. Execution result: ${String(receipt.txExecutionResultName)}`;
    saveDeploymentState({
      status: "FAILED",
      transactionHash: deploymentTx,
      wallet,
      failedAt: new Date().toISOString(),
      statusName: String(receipt.statusName),
      executionResult: String(receipt.txExecutionResultName),
      error: failure,
    });
    throw new Error(failure);
  }

  // Keep PENDING until both address extraction and code verification succeed;
  // a transient read failure must not make a second deployment possible.
  const contractAddress = getContractAddress(receipt);
  const deployedCode = await client.getContractCode(contractAddress as `0x${string}`);
  if (typeof deployedCode !== "string" || !deployedCode.trim()) {
    throw new Error(`GenLayer returned no deployed code for ${contractAddress}.`);
  }

  const explorerBase = testnetBradbury.blockExplorers?.default.url;
  if (!explorerBase) {
    throw new Error("The official Bradbury chain definition has no explorer URL.");
  }

  const result: DeploymentResult = {
    network: "Bradbury",
    chainId: testnetBradbury.id,
    wallet,
    deploymentTx,
    contractAddress,
    status: String(receipt.statusName),
    executionResult: String(receipt.txExecutionResultName),
    explorerUrl: `${explorerBase}/tx/${deploymentTx}`,
  };

  saveDeploymentState({
    status: "SUCCESS",
    transactionHash: deploymentTx,
    contractAddress,
    wallet,
    finalizedAt: new Date().toISOString(),
    statusName: TransactionStatus.FINALIZED,
    executionResult: ExecutionResult.FINISHED_WITH_RETURN,
    explorerUrl: result.explorerUrl,
  });
  printDeploymentSummary(result);
  return result;
}

function resultFromSuccess(state: Extract<DeploymentState, { status: "SUCCESS" }>): DeploymentResult {
  const result: DeploymentResult = {
    network: "Bradbury",
    chainId: EXPECTED_CHAIN_NUMBER,
    wallet: state.wallet,
    deploymentTx: state.transactionHash,
    contractAddress: state.contractAddress,
    status: state.statusName,
    executionResult: state.executionResult,
    explorerUrl: state.explorerUrl,
  };
  printDeploymentSummary(result);
  return result;
}

/**
 * Deploy once, or resume tracking a known transaction. This function is the
 * only entry point that can request wallet access or call deployContract().
 */
export async function deployAgentzProof(): Promise<DeploymentResult> {
  const existingState = loadDeploymentState();

  if (existingState?.status === "SUCCESS") {
    console.warn("Deployment already succeeded; returning the persisted result without wallet access or redeployment.");
    return resultFromSuccess(existingState);
  }

  if (existingState?.status === "SUBMITTING") {
    throw new Error(
      `A deployment submission was interrupted at ${existingState.startedAt} before its transaction hash was recorded. Inspect the wallet/network manually; refusing to submit another deployment.`,
    );
  }

  const provider = getProvider();
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  if (!Array.isArray(accounts) || accounts.length === 0) {
    throw new Error("The browser wallet returned no account.");
  }
  const wallet = requireAddress(accounts[0], "wallet");

  const chainId = await provider.request({ method: "eth_chainId" });
  if (String(chainId).toLowerCase() !== EXPECTED_CHAIN_ID) {
    throw new Error(`Wallet is on chain ${String(chainId)}; switch it to Bradbury (4221) before deploying.`);
  }

  if (testnetBradbury.id !== EXPECTED_CHAIN_NUMBER) {
    throw new Error(`Installed genlayer-js Bradbury chain ID is ${testnetBradbury.id}, expected ${EXPECTED_CHAIN_NUMBER}.`);
  }

  const client = createClient({
    chain: testnetBradbury,
    account: wallet as `0x${string}`,
    provider: provider as unknown as NonNullable<Parameters<typeof createClient>[0]>["provider"],
  });

  if (existingState?.status === "PENDING") {
    if (existingState.wallet !== "unknown" && existingState.wallet.toLowerCase() !== wallet.toLowerCase()) {
      throw new Error(`Pending deployment belongs to wallet ${existingState.wallet}; refusing to track it from ${wallet}.`);
    }
    console.warn("Pending deployment found; resuming it without submitting another transaction.");
    return trackDeployment(client, wallet, existingState.transactionHash);
  }

  if (existingState?.status === "FAILED") {
    console.warn(`Previous deployment failed: ${existingState.error}`);
  }

  console.log("AgentzProof deployment");
  console.log("Network: Bradbury");
  console.log("Chain ID: 4221");
  console.log(`Wallet: ${wallet}`);
  console.log("Contract: AgentzProofVerifier");
  console.log("ESTIMATED_FEE", "UNAVAILABLE_IN_GENLAYER_JS_1.1.8; REVIEW_WALLET_CONFIRMATION");

  if (!window.confirm("Deploy AgentzProofVerifier to Bradbury? This submits exactly one deployment transaction.")) {
    throw new Error("Deployment cancelled by the user before signing.");
  }

  const contractCode = await loadContractCode();

  // Write a durable lock before entering the SDK call. If the browser crashes
  // while the provider is submitting, the next invocation refuses to guess and
  // cannot accidentally submit a second deployment.
  saveDeploymentState({
    status: "SUBMITTING",
    wallet,
    startedAt: new Date().toISOString(),
  });

  // This call is intentionally single-shot. Never retry it automatically.
  const deploymentTx = requireTransactionHash(
    await client.deployContract({ code: contractCode, args: [] }),
  );
  saveDeploymentState({
    status: "PENDING",
    transactionHash: deploymentTx,
    wallet,
    submittedAt: new Date().toISOString(),
  });
  console.log("DEPLOYMENT_TX", deploymentTx);

  return trackDeployment(client, wallet, deploymentTx);
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
    deployAgentzProof?: typeof deployAgentzProof;
    recoverInterruptedDeployment?: typeof recoverInterruptedDeployment;
  }
}

if (typeof window !== "undefined") {
  window.deployAgentzProof = deployAgentzProof;
  window.recoverInterruptedDeployment = recoverInterruptedDeployment;
}
