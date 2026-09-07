# AgentzProof frontend

Next.js 16 + TypeScript + Tailwind 4 application for AgentzProof — independent
verification of AI-agent work, adjudicated by GenLayer. Live LLM adjudication uses
`gl.vm.run_nondet_unsafe(leader_fn, validator_fn)`; `strict_eq` is reserved for
canonicalized web evidence.

See the [root README](../README.md) for the full project (contract, deployment,
demo).

## Quick start

```bash
npm install
cp .env.example .env.local   # demo mode works with no variables set
npm run dev
```

## Scripts

```bash
npm run lint          # eslint
npx tsc --noEmit      # typecheck
npm test              # vitest (34 tests)
npm run build         # production build
```

## Architecture

- `app/api/` — route handlers: verifications CRUD, submit, verify, demo/load.
- `lib/verifier/` — deterministic checks, local judge (demo), engine, schema —
  mirrors `contracts/AgentzProofVerifier.py`.
- `lib/genlayer/` — live on-chain verification through `genlayer-js`
  (`GENLAYER_*` env vars). When unset, the app runs DEMO MODE and labels
  results honestly. The live contract records `run_nondet_unsafe` for LLM adjudication
  and `strict_eq` only for canonicalized web evidence.
- `lib/demo/` — the three built-in demo scenarios + controlled fixture
  test-suite runner.
- `components/`, `app/` — pages: `/`, `/create`, `/jobs`, `/jobs/[id]`,
  `/verify/[id]`, `/about`, `/demo`.

## Live vs demo mode

- **DEMO MODE** (no `GENLAYER_CONTRACT_ADDRESS`): deterministic checks run for
  real; subjective requirements are adjudicated by a local rule-based judge
  that mirrors the contract's structure. Results are labeled `DEMO MODE`.
- **LIVE** (`GENLAYER_CONTRACT_ADDRESS` set): every verification calls
  `AgentzProofVerifier.verify()` on-chain via genlayer-js and reports the real
  transaction hash, contract address, and network. Transaction hashes are
  never fabricated — without a deployed contract the UI shows "Not deployed".