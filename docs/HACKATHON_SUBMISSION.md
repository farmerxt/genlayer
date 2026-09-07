# AgentzProof — Agent Tank Submission Guide

This guide is the canonical checklist for submitting AgentzProof to the GenLayer Agent Tank hackathon.

## Submission

Open:

- Portal: <https://portal.genlayer.foundation/agent-tank/hackathon/submit/>
- Website: <https://www.agentzproof.xyz/>
- Demo: <https://www.agentzproof.xyz/demo>
- Create flow: <https://www.agentzproof.xyz/create>
- Network/jobs: <https://www.agentzproof.xyz/jobs>
- How it works: <https://www.agentzproof.xyz/about>
- Repository: <https://github.com/farmerxt/genlayer>

Select the track:

```text
Agentic Infrastructure
```

(Select the infrastructure track exactly as labelled on the portal — "Agentic Infrastructure" or "Agents Commerce Infrastructure". AgentzProof is a verification/proof layer that agents plug into, i.e. infrastructure for the agentic economy. Do not select Onchain Justice, which is about dispute arbitration.)

### Recommended fields

**Project name**

```text
AgentzProof — The Agentic Proof Engine
```

**One-liner**

```text
AI agents submit work; GenLayer independently verifies whether it actually satisfies the agreement.
```

**Website**

```text
https://www.agentzproof.xyz/
```

**Demo URL**

```text
https://www.agentzproof.xyz/demo
```

**GitHub**

```text
https://github.com/farmerxt/genlayer
```

### Description

```text
AgentzProof is verification infrastructure for AI-agent work. A buyer defines an agreement, requirements, and evidence expectations; an agent submits a deliverable; and AgentzProof combines deterministic checks with GenLayer Intelligent Contract consensus to determine whether the work actually satisfies the agreement.

Traditional smart contracts can verify deterministic facts, but they cannot reliably judge whether an AI-generated deliverable meets a natural-language requirement. AgentzProof separates objective verification from subjective judgment.

Deterministic checks verify facts such as required files, functions, strings, patterns, test outcomes, and web evidence. Subjective requirements are evaluated through GenLayer using independent leader/validator evaluation. Validators compare stable decision fields and requirement verdicts; natural-language reasoning is explanatory and is not required to match.

Deterministic failures remain authoritative and cannot be overridden by an LLM. Submitted deliverables and evidence are untrusted data, with bounded inputs, schema validation, and prompt-injection defenses. Submitted code is never executed by the application.

The result is a structured PASS or FAIL proof with requirement-level verdicts, evidence, consensus metadata, and GenLayer transaction information when the live path completes.
```

## Verified technical facts

```text
Network: testnetBradbury
Chain ID: 4221
Contract: 0xbe1de3345603162554fcdff2b75cf4aa96c74329
Deployment transaction: 0x61be412b8b8ab9a85cc8f1571781cb22a41326695f6f4ae147f02363db05c57c
```

Only use those values where the form requests deployed-contract information. Never invent a transaction hash, explorer URL, result, or validator count.

## Reviewer walkthrough

### Safe product demo — no wallet required

1. Open <https://www.agentzproof.xyz/demo>.
2. Confirm the page says `DEMO · SIMULATED` and `NO WALLET REQUIRED`.
3. Choose **Password Reset Implementation**.
4. Run the demo once.
5. Observe evidence intake, deterministic checks, validator/adjudication stages, consensus, and the final FAIL result.
6. Inspect the failed requirement and explanation.
7. Optionally run **Password Reset Implementation — Correct** and confirm the expected PASS result.
8. Optionally run **Research Deliverable** and inspect its evidence-driven result.

Do not describe this demo as an on-chain transaction. It is a local application demonstration and is intentionally labeled simulated.

### Live application walkthrough

1. Open <https://www.agentzproof.xyz/create>.
2. Create a verification agreement.
3. Confirm the browser navigates to `/jobs/<verification-id>`.
4. Submit a deliverable and evidence.
5. Confirm the record displays `SUBMITTED`.
6. Refresh once and confirm the same record remains available.
7. Click **Verify with GenLayer** once.
8. Wait for the final result. Do not repeatedly click Verify.
9. A real live result must include a real transaction hash and final status. A Bradbury capacity rejection must say that no proof was submitted and leave the record safely retryable.
10. Refresh and confirm the final record remains available.

If the page shows a 504, `VERIFYING`, or an unknown transaction outcome, do not retry blindly. Check the record and transaction status first.

## Live vs simulated wording

Use these terms accurately:

- `DEMO · SIMULATED`: local/demo engine; no wallet or blockchain transaction.
- `LIVE · ON-CHAIN`: a real GenLayer request with a returned transaction hash and finalized result.
- `SUBMITTED` or `VERIFYING`: not a final proof; do not call it verified.
- `PASSED` / `FAILED`: use as final results only after the live transaction path has completed.

## What to explain about GenLayer

AgentzProof uses deterministic checks first. Subjective requirements use the contract's leader/validator consensus pattern with `gl.vm.run_nondet_unsafe(leader_fn, validator_fn)` and structured JSON from `gl.nondet.exec_prompt(..., response_format="json")`. Natural-language reasoning is not a consensus key. Canonicalized web observations may use `gl.eq_principle.strict_eq`; LLM outputs must not be placed inside `strict_eq`.

## Production status (verified)

- Persistence: Vercel KV (`KV_REST_API_URL` / `KV_REST_API_TOKEN`) — reads and writes confirmed working.
- Live verification: asynchronous submit → persist hash → client polls `/finalize`. Verified submitting a real GenLayer Bradbury transaction (tx `0x742ea85c…`).
- Demo: simulated, no wallet required.
- Do not redeploy the GenLayer contract; use the deployed address above.

## Final portal checklist

Before clicking the portal's final Submit button:

- [ ] Track is `Agentic Infrastructure` (exact portal label).
- [ ] Project name and one-liner are correct.
- [ ] Website opens successfully.
- [ ] Demo opens and is labeled simulated.
- [ ] GitHub repository is public and contains the intended latest code.
- [ ] The deployed contract address is copied exactly if requested.
- [ ] No private key, seed phrase, API token, or `.env` value is included.
- [ ] Simulated results are not described as live transactions.
- [ ] Any live transaction hash shown is copied from the actual application/network result.
- [ ] Limitations are disclosed: Bradbury capacity, serverless persistence configuration, and testnet status.
