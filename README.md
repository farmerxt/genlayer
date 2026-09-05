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
6. **Validators reach consensus** — identical structured statuses across independent validators.
7. **PASS / FAIL is recorded** — per-requirement results, reasons, evidence used, on-chain.

## Why GenLayer?

Ordinary smart contracts verify **deterministic facts**: a payment arrived, a signature is
valid, a bytecode matches. They cannot read a deliverable and judge whether it satisfies a
natural-language requirement — "does this implementation actually reject expired tokens?" is a
question of **understanding, not arithmetic**.

GenLayer Intelligent Contracts run Python on-chain, call LLMs natively, access the web, and
reach consensus through the **Equivalence Principle**: independent validators must converge on
identical output. That is exactly the judgment layer agentic transactions need. AgentzProof
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
                                   │  LLM adjudication (strict_eq)            │
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
`gl.eq_principle.strict_eq`, `TreeMap` storage).

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

The contract deliberately separates **deterministic facts** from **subjective judgment**:

| Layer | Mechanism | Consensus |
|---|---|---|
| Deterministic checks | Pure Python — byte-identical on every validator | No consensus needed (identical by construction) |
| Web evidence | `gl.nondet.web.render` inside `gl.eq_principle.strict_eq` | Validators converge on one canonical web result |
| Subjective requirements | `gl.nondet.exec_prompt` inside `strict_eq` | Validators must produce **identical** output |

Consensus-friendliness rules implemented in the contract:

- The LLM **never decides deterministic requirements** — deterministic facts are ground truth
  passed to the LLM, and it is instructed (and structurally prevented) from changing them.
- The LLM outputs **only stable statuses** (`PASS`/`FAIL` per subjective requirement) — never
  free-form prose. Reasons, scores, and summaries are assembled deterministically by the
  contract, so validator outputs can actually satisfy strict equality.
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

### 3. Deploy the Intelligent Contract

```bash
# from the repo root
npm install                    # installs genlayer-js for the deploy script
genlayer deploy                # runs deploy/deployScript.ts
# → prints: AgentzProofVerifier deployed 🎉  Contract address: 0x…
```

### 4. Configure the frontend

```bash
cd frontend
cp .env.example .env.local
# set:
#   GENLAYER_CONTRACT_ADDRESS=<address from step 3>
#   GENLAYER_NETWORK=studionet            # match step 2
#   GENLAYER_RPC_URL=https://studio.genlayer.com/api
#   GENLAYER_PRIVATE_KEY=<server-side key, optional>
npm run dev
```

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
tests/direct/                      # 22 in-memory contract tests (pass, fail, injection red-team, …)
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