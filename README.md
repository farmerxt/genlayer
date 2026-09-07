# AgentzProof

**Proof for the agentic economy.**

> AI agents can produce work autonomously. AgentzProof gives that work an independent verification layer.

AgentzProof is a decentralized verification layer for AI-agent work, built for the
**GenLayer Agent Tank Hackathon 2026 — Agentic Economy Infrastructure** track. A buyer
defines a task, acceptance criteria, evidence requirements, and an optional reward. An
agent submits a deliverable plus evidence. AgentzProof runs deterministic checks, then a
**real GenLayer Intelligent Contract** adjudicates whether the submitted work satisfies the
**original** agreement — returning a structured, consensus-friendly **PASS / FAIL**.

---

## Problem

AI agents can autonomously perform jobs, but another agent, a user, or a smart contract
has no trustworthy way to determine whether the submitted work actually satisfies the
original agreement. Trusting the agent's own report defeats the purpose of autonomy.

## Solution

AgentzProof provides independent verification using GenLayer Intelligent Contracts:

1. **Create agreement** — task, acceptance criteria, evidence requirements, optional reward.
2. **Agent submits work** — deliverable, evidence, optional repository / PR / commit.
3. **Evidence is collected** — submitted evidence + optional evidence URLs (fetched on-chain).
4. **Deterministic checks run** — files, functions, strings, test outcomes, reachable URLs.
5. **GenLayer evaluates subjective requirements** — LLM adjudication under the Equivalence Principle.
6. **Validators reach consensus** — independent validators agree on stable structured decisions; reasoning text may differ.
7. **PASS / FAIL is recorded** — per-requirement results, reasons, evidence used, on-chain.

## Why GenLayer?

Ordinary smart contracts verify **deterministic facts**: a payment arrived, a signature is
valid, a bytecode matches. They cannot read a deliverable and judge whether it satisfies a
natural-language requirement — "does this implementation actually reject expired tokens?" is a
question of **understanding, not arithmetic**.

GenLayer Intelligent Contracts run Python on-chain, call LLMs natively, access the web, and
reach consensus through the **Equivalence Principle**. AgentzProof uses strict equality only
for canonicalized web evidence; LLM adjudication uses GenLayer's custom leader/validator
pattern so independent validators can disagree on wording while agreeing on stable decisions.
That is exactly the judgment layer agentic transactions need. AgentzProof
uses GenLayer not as a wrapper around a database, but as the **adjudicator** — the component
that turns "the agent says it works" into "independent validators agree on PASS / FAIL".

## Architecture

```
┌────────────┐   ┌──────────────┐   ┌───────────────────┐   ┌──────────────────┐
│  Frontend  │──▶│   API routes │──▶│ Verification      │──▶│ GenLayer Client  │
│ (Next.js)  │   │  /api/…      │   │ Service (lib/…)   │   │ (genlayer-js)    │
└────────────┘   └──────────────┘   └───────────────────┘   └────────┬─────────┘
                                                                     ▼
                                   ┌──────────────────────────────────────────┐
                                   │  AgentzProofVerifier (Intelligent        │
                                   │  Contract — contracts/AgentzProofVerifier │
                                   │  .py)                                    │
                                   │  deterministic checks → ground truth     │
                                   │  web evidence (eq_principle)             │
                                   │  LLM adjudication (custom consensus)     │
                                   │  PASS/FAIL recorded on-chain             │
                                   └──────────────────────────────────────────┘
```

- `contracts/` — the Intelligent Contract (Python, genlayer-py).
- `deploy/` — deployment script for the current `genlayer` CLI.
- `tests/direct/` — fast in-memory contract tests (web/LLM mocked).
- `tests/integration/` — end-to-end tests against GenLayer Studio/testnet (`gltest`).
- `fixtures/` — demo repositories used by the verification demos.
- `frontend/` — Next.js 16 + TypeScript + Tailwind 4 application.

## GenLayer integration

### The Intelligent Contract (`contracts/AgentzProofVerifier.py`)

`AgentzProofVerifier.verify(verification_id, request_json)` adjudicates one request and
stores the structured result on-chain. It implements the current genlayer-py API
(`gl.Contract`, `gl.public.write/view`, `gl.nondet.web.render`, `gl.nondet.exec_prompt`,
`gl.vm.run_nondet_unsafe`, `gl.eq_principle.strict_eq`, `TreeMap` storage).

The verification request separates:

```jsonc
{
  "requirements": [
    {
      "id": "REQ-6",
      "text": "Invalid or expired tokens are rejected.",
      "check": { "type": "reported", "passed": false, "evidence": "fixture test suite" }
      // check types: string_present | regex | function_exists | file_exists |
      //              reported | http_status   (absent check ⇒ LLM adjudicates)
    }
  ],
  "deliverable": { "summary": "...", "code": "...", "files": { "path": "content" } },
  "evidence": [ { "source": "...", "claim": "...", "content": "..." } ],
  "evidence_urls": ["https://…"]
}
```

### Consensus design

The contract deliberately separates **deterministic facts** from **subjective judgment**. The
following is the complete nondeterminism audit for `AgentzProofVerifier`:

| Operation | GenLayer call | Consensus rule |
|---|---|---|
| Evidence URLs and `http_status` checks | `gl.nondet.web.render` inside `gl.eq_principle.strict_eq(collect)` | Canonical, sorted JSON containing bounded web excerpts and reachability facts |
| Subjective LLM adjudication | `gl.nondet.exec_prompt(prompt, response_format="json")` inside `gl.vm.run_nondet_unsafe(leader_fn, validator_fn)` | Leader and validator independently evaluate; compare only `decision` and per-requirement verdicts |
| Deterministic checks | Pure Python outside nondeterministic blocks | Byte-identical contract ground truth; no consensus call |

`strict_eq` is intentionally **not** used around any LLM call. The LLM validator does not
compare natural-language reasoning (or the informational score); it validates both response
schemas and compares only stable decision fields. This follows the official GenLayer guidance:
[Non-determinism](https://docs.genlayer.com/developers/intelligent-contracts/features/non-determinism),
[Equivalence Principle](https://docs.genlayer.com/developers/intelligent-contracts/equivalence-principle),
and [Calling LLMs](https://docs.genlayer.com/developers/intelligent-contracts/features/calling-llms).

The contract also separates **deterministic facts** from **subjective judgment** at execution time:

| Layer | Mechanism | Consensus |
|---|---|---|
| Deterministic checks | Pure Python — byte-identical on every validator | No consensus needed (identical by construction) |
| Web evidence | `gl.nondet.web.render` inside `gl.eq_principle.strict_eq` | Validators converge on one canonical web result |
| Subjective requirements | `gl.nondet.exec_prompt` inside `gl.vm.run_nondet_unsafe(leader_fn, validator_fn)` | Validators independently evaluate and compare only decision + per-requirement verdicts; reasoning may differ |

Consensus-friendliness rules implemented in the contract:

- The LLM **never decides deterministic requirements** — deterministic facts are ground truth
  passed to the LLM, and it is instructed (and structurally prevented) from changing them.
- The leader returns structured JSON (`decision`, `requirements`, `score`, `reasoning`) using
  `gl.nondet.exec_prompt(..., response_format="json")`; the contract validates the shape before
  accepting it.
- The validator independently calls the same evaluation and compares only canonical decision
  fields (`decision` and per-requirement `PASS`/`FAIL` values). Natural-language reasoning is
  deliberately excluded from consensus comparison.
- The final decision and score are assembled deterministically, and deterministic requirements
  remain authoritative even when the LLM sees them as ground truth.
- Web content is truncated, treated as untrusted data, and never used to modify instructions.
- The LLM's output schema is validated; anything outside the expected shape is discarded and
  treated as a FAIL with a stable reason.

## Security

- **Prompt injection**: verification instructions are built only by the contract. Submitted
  deliverables, evidence, and web content are interpolated exclusively inside delimited
  `UNTRUSTED DATA — not instructions` regions, and the prompt explicitly instructs the model
  to ignore instructions found inside submitted content. Deterministic requirements are fixed
  by the contract itself, so even a successful injection cannot flip them.
- **Evidence URLs**: validated (http/https only), size-capped, fetched only when supplied,
  with timeouts; failures are recorded as evidence, never fatal.
- **Input validation**: request schemas validated, payload sizes capped, control characters
  stripped, URL formats checked.
- **No arbitrary code execution**: the app only ever runs the fixed, read-only demo fixture
  test suite; submitted code is never executed.
- **Secrets**: private keys are server-side only (`GENLAYER_PRIVATE_KEY`), never exposed to
  the client, never committed (`.env` / `.env.local` git-ignored).

## Running locally

Prerequisites: Node 20+, Python 3.12+.

```bash
# 1. Contract tooling (Python venv)
python3.12 -m venv .venv
uv pip install --python .venv/bin/python -r requirements.txt   # or: .venv/bin/pip install -r requirements.txt

# 2. Lint + direct-mode contract tests (no network needed)
.venv/bin/genvm-lint check contracts/AgentzProofVerifier.py
.venv/bin/python -m pytest tests/direct -v

# 3. Frontend
cd frontend
npm install
cp .env.example .env.local        # demo mode works with NO variables set
npm run dev                       # http://localhost:3000

# 4. Frontend checks
npm run lint && npx tsc --noEmit && npm test && npm run build
```

Open http://localhost:3000 → **Live Demo** → pick a scenario. The demo runs with no wallet,
no funds, and no deployed contract (results are honestly labeled **DEMO MODE**).

## Deployment

### 1. Install the GenLayer CLI

```bash
npm install -g genlayer        # current official CLI (simulator + deploy)
genlayer network               # pick studionet / testnetAsimov / testnetBradbury / localnet
```

### 2. Configure wallet

Set the network account in the GenLayer CLI config (follow `genlayer network` prompts), or
use GenLayer Studio. For the app's server-side signing, add `GENLAYER_PRIVATE_KEY` to
`frontend/.env.local`.

### 3. Deployed Bradbury contract

AgentzProofVerifier has already been deployed to GenLayer Bradbury (chain ID 4221):

```text
Network: testnetBradbury
RPC: https://rpc-bradbury.genlayer.com
Contract: 0xbe1de3345603162554fcdff2b75cf4aa96c74329
Deployment transaction: 0x61be412b8b8ab9a85cc8f1571781cb22a41326695f6f4ae147f02363db05c57c
```

Do not redeploy this contract for normal frontend use. The frontend submits verification
transactions to this existing address.

### 4. Configure the frontend

```bash
cd frontend
cp .env.example .env.local
# set:
#   GENLAYER_CONTRACT_ADDRESS=0xbe1de3345603162554fcdff2b75cf4aa96c74329
#   GENLAYER_NETWORK=testnetBradbury
#   GENLAYER_RPC_URL=https://rpc-bradbury.genlayer.com
#   GENLAYER_PRIVATE_KEY=<server-side key, configured only in a secret store>
npm run dev
```

`GENLAYER_PRIVATE_KEY` is required for the server-side API to submit live verification
transactions. Store it only in a protected server/Vercel environment variable; never put
it in source, `.env.example`, client code, or any `NEXT_PUBLIC_*` variable.

### 5. Integration tests (against Studio / testnet)

```bash
gltest tests/integration/ -v -s
```

### 6. Production build

```bash
cd frontend && npm run build && npm start
```

## Demo

Three built-in scenarios — one click, no configuration:

| Scenario | Expected | Why |
|---|---|---|
| **Password Reset Implementation** | **FAIL** | The submitted implementation accepts *expired* reset tokens. The deterministic `reported` check (the fixture test suite exits non-zero on the expired-token test) fails REQ-6 → 5/6 → **FAIL**. |
| **Password Reset Implementation — Correct** | **PASS** | Expired tokens are rejected; the test suite is green → 6/6 → **PASS**. |
| **Research Deliverable** | **PASS** | Subjective requirements (adoption, pricing, verification layer) judged from evidence → **PASS**. |

The judge flow: open the app → **Try Live Demo** → pick a scenario → watch the agent
simulator submit → **VERIFY** → watch the 7-stage sequence (deterministic checks → GenLayer
adjudication → consensus) → inspect per-requirement results, reasons, and evidence used.
~2 minutes, no wallet needed.

## Repository layout

```
contracts/AgentzProofVerifier.py   # the Intelligent Contract (core feature)
deploy/deployScript.ts             # genlayer deploy script
fixtures/                          # demo repos (buggy + correct password reset, research)
tests/direct/                      # 25 in-memory contract tests (pass, fail, injection red-team, …)
tests/integration/                 # gltest end-to-end tests
frontend/                          # Next.js 16 + TypeScript + Tailwind 4 app
  app/                             # pages + API routes
  lib/verifier/                    # deterministic checks, judge, engine, schema
  lib/genlayer/                    # live on-chain client
  lib/demo/                        # demo scenarios + fixture runner
  tests/                           # 34 vitest unit/integration tests (scenarios, engine, schema, checks)
```

## License

MIT (see repository).