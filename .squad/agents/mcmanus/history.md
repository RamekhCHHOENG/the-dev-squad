# Project Context

- **Owner:** RamekhCHHOENG
- **Project:** The Dev Squad — a Next.js 16 app that gives Claude its own dev team (Supervisor, Planner, Plan Reviewer, Coder, Tester) with pipeline orchestration and two UI interfaces: Office View and Squad View.
- **Stack:** TypeScript, Next.js 16, React 19, Tailwind CSS v4, Framer Motion, Claude Opus 4.6, Node.js 22+
- **Created:** 2026-04-17
- **Version:** v0.3.17

## Test Scripts

All scripts run with: `node --experimental-strip-types scripts/{name}.mjs`

- `scripts/test-pipeline-runtime.mjs` — pipeline runtime behavior
- `scripts/test-supervisor-intents.mjs` — supervisor intent parsing
- `scripts/test-build-memory.mjs` — build memory system (new, untracked)
- `scripts/test-runner.mjs` — base runner (referenced by `test:runner`)
- `scripts/test-hook-contract.mjs` — approval gate hook contract tests
- `scripts/test-structured-output-parser.mjs` — structured JSON signal parsing
- `scripts/test-pipeline-planning.mjs` — planning phase behavior
- `scripts/test-supervisor-snapshot.mjs` — supervisor state snapshot

## npm Test Scripts

```
pnpm test:runner     → node --experimental-strip-types scripts/test-runner.mjs
pnpm test:hook       → node scripts/test-hook-contract.mjs
pnpm test:signals    → node --experimental-strip-types scripts/test-structured-output-parser.mjs
pnpm test:runtime    → node --experimental-strip-types scripts/test-pipeline-runtime.mjs
pnpm test:planning   → node --experimental-strip-types scripts/test-pipeline-planning.mjs
pnpm test:supervisor → node --experimental-strip-types scripts/test-supervisor-snapshot.mjs
pnpm test:supervisor-concept → ...test-supervisor-concept.mjs
pnpm test:supervisor-intents → ...test-supervisor-intents.mjs
pnpm test:memory     → node --experimental-strip-types scripts/test-build-memory.mjs
```

## Architecture Notes

- Pipeline agents (roles A-D) each have a corresponding test
- The plan lock is the critical invariant: after plan review approval, `plan.md` must not be modified
- Stall detection, session recovery, and resume behavior are the most important edge cases
- `approval-gate.sh` behavior must be tested via `test:hook`

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

### 2026-04-17 — Test Coverage Audit (v0.3.17)

**All 9 test scripts pass cleanly.** No failures. Total ~120+ assertions across the suite.

| Script | Status | Assertions |
|--------|--------|-----------|
| test-pipeline-runtime.mjs | ✅ PASS | 13 |
| test-supervisor-intents.mjs | ✅ PASS | 23 |
| test-hook-contract.mjs | ✅ PASS | 25 |
| test-structured-output-parser.mjs | ✅ PASS | 9 |
| test-pipeline-planning.mjs | ✅ PASS | 12 |
| test-supervisor-snapshot.mjs | ✅ PASS | ~20 |
| test-supervisor-concept.mjs | ✅ PASS | – |
| test-build-memory.mjs | ✅ PASS | 15 |
| test-runner.mjs | ✅ PASS | – |

**Critical gaps escalated to decisions.md:**

1. **`pipeline-approval.ts` (144 lines) — ZERO tests.** Contains `waitForPendingApproval` polling loop, `findLatestPendingApproval`, and `clearApprovedBashGrant` with requestId matching. This is the most dangerous gap.

2. **`pipeline-control.ts` (339 lines) — ZERO tests.** Contains `findLatestProject`, `stopPipeline`, and cancel-path memory-saving logic.

3. **`src/app/api/memory/route.ts` — ZERO tests.** HTTP handler layer (query-param parsing, response shapes) untested.

4. **Hook contract missing agents E and F.** No firewall permission tests for Security Auditor and DevOps Engineer.

5. **`pipeline-supervisor.ts` phases `security-audit` and `devops` — no snapshot tests.**

6. **`use-pipeline.ts` (300 lines) — untestable as-is.** React hook — extract pure state-transition logic for unit testing.

**Noise:** Every `--experimental-strip-types` test emits `MODULE_TYPELESS_PACKAGE_JSON` warning. Adding `"type": "module"` to `package.json` would silence all.

**Decisions recorded:** 5 decisions escalated to `.squad/decisions.md` — approval gate tests needed (P1), hook contract E/F coverage (P1), control module tests (P2), API handler tests (P2), supervisor snapshot coverage (P2).
