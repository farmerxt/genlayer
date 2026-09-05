/**
 * Deployment script for the AgentzProofVerifier Intelligent Contract.
 *
 * Run with the current GenLayer CLI (npm install -g genlayer):
 *
 *   genlayer network            # pick studionet / testnet / localnet
 *   genlayer deploy             # runs this script
 *
 * The CLI passes in a configured GenLayerClient. This script deploys
 * contracts/AgentzProofVerifier.py and prints the deployed contract address —
 * paste it into frontend/.env as GENLAYER_CONTRACT_ADDRESS.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import type {
  TransactionHash,
  TransactionStatus,
  GenLayerClient,
  DecodedDeployData,
  GenLayerChain,
} from "genlayer-js/types";
import { localnet } from "genlayer-js/chains";

export default async function main(client: GenLayerClient<any>) {
  const filePath = path.resolve(process.cwd(), "contracts/AgentzProofVerifier.py");

  const contractCode = new Uint8Array(readFileSync(filePath));

  const deployTransaction = await client.deployContract({
    code: contractCode,
    args: [],
  });

  const receipt = await client.waitForTransactionReceipt({
    hash: deployTransaction as TransactionHash,
    status: TransactionStatus.ACCEPTED,
    retries: 200,
  });

  if (
    receipt.status !== 5 &&
    receipt.status !== 6 &&
    receipt.statusName !== "ACCEPTED" &&
    receipt.statusName !== "FINALIZED"
  ) {
    throw new Error(`Deployment failed. Receipt: ${JSON.stringify(receipt)}`);
  }

  const deployedContractAddress =
    (client.chain as GenLayerChain).id === localnet.id
      ? receipt.data.contract_address
      : (receipt.txDataDecoded as DecodedDeployData)?.contractAddress;

  if (!deployedContractAddress) {
    throw new Error("Deployment succeeded but no contract address was returned.");
  }

  console.log("──────────────────────────────────────────────────────");
  console.log("AgentzProofVerifier deployed 🎉");
  console.log(`Contract address: ${deployedContractAddress}`);
  console.log("──────────────────────────────────────────────────────");
  console.log("Next: set GENLAYER_CONTRACT_ADDRESS in frontend/.env.local");
  console.log("(optionally GENLAYER_RPC_URL, GENLAYER_NETWORK, GENLAYER_PRIVATE_KEY)");
  console.log("Then run the app and verify with real on-chain consensus.");

  return deployedContractAddress;
}