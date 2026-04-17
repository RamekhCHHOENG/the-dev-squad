# Project Context

- **Owner:** RamekhCHHOENG
- **Project:** The Dev Squad — a Next.js 16 app that gives Claude its own dev team (Supervisor, Planner, Plan Reviewer, Coder, Tester) with pipeline orchestration and two UI interfaces: Office View and Squad View.
- **Stack:** TypeScript, Next.js 16, React 19, Tailwind CSS v4, Framer Motion, Claude Opus 4.6, Node.js 22+
- **Created:** 2026-04-17
- **Version:** v0.3.17

## Key Files — My Domain

- `pipeline/orchestrator.ts` — main orchestration engine; routes signals between roles A-F
- `pipeline/role-a.md` through `role-f.md` — role prompt files (A=Planner, B=Reviewer, C=Coder, D=Tester, E/F=new)
- `pipeline/.claude/hooks/approval-gate.sh` — PreToolUse approval hook enforcing pipeline restrictions
- `src/app/api/chat/route.ts` — Supervisor chat route; injects live team snapshot into context
- `src/app/api/state/route.ts` — Pipeline state read endpoint
- `src/app/api/memory/` — Build memory API (new, untracked)
- `src/lib/pipeline-supervisor.ts` — supervisor state machine and recovery logic
- `src/lib/supervisor-intents.ts` — structured intent parsing from supervisor chat
- `src/lib/pipeline-control.ts` — start/stop/resume control plane
- `src/lib/pipeline-planning.ts` — planning phase logic
- `src/lib/build-memory.ts` — build memory persistence (new, untracked)
- `scripts/test-pipeline-runtime.mjs` — runtime behavior tests
- `scripts/test-supervisor-intents.mjs` — intent parser tests
- `scripts/test-build-memory.mjs` — build memory tests (new, untracked)

## Architecture Notes

- Pipeline agents communicate via structured JSON signals
- The supervisor injects a live team snapshot on every chat turn
- Plan lock is enforced: after Plan Reviewer approves, no agent may modify `plan.md`
- `approval-gate.sh` is the security boundary — restricts what agents can run
- Role files E and F are new additions (untracked) — purpose TBD

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

### 2026-04-17 — Tier 1 fixes applied

**Fix 1 — tsconfig.json exclude pipeline/**  
`tsconfig.json` already had `"exclude": ["node_modules"]` — just appended `"pipeline"` to the array. The pipeline runs via `tsx`, not Next.js, so excluding it is the right boundary. `next-env.d.ts` is unaffected; it's included explicitly before the glob.

**Fix 2 — PipelineAgentId in pipeline/runner.ts**  
Type was `'A' | 'B' | 'C' | 'D' | 'S'`. Added `'E' | 'F'`. No re-exports or local redefinitions found in `pipeline/orchestrator.ts` — it imports `PipelineAgentId` from runner directly. Single-file fix.

**Fix 3 — normalizeState() in src/app/api/state/route.ts**  
The ternary only checked two resume actions. Extended it to a four-way OR: `continue-approved-plan | resume-stalled-turn | resume-from-code-review | resume-from-testing`. No shared utility — normalizer is inline in the route file.

**Fix 4 — Committed ~907 lines of uncommitted work**  
Branched to `feat/build-memory-ef-agents`. Commit included: build memory system, E/F role files, supervisor intents overhaul, orchestrator E/F routing, pipeline-control expansion, UI polish, plus the 3 tier-1 code fixes above. All 3 test scripts (runtime, supervisor-intents, hook-contract) passed clean before commit.

### 2026-04-17 — Tier 1 Fixes Complete

Applied 3 critical type fixes to unblock next build and E/F agent integration. All changes committed to feat/build-memory-ef-agents. Next: hockney must fix page.tsx regression, then branch is ready for review.

