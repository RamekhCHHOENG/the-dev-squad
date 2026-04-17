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
