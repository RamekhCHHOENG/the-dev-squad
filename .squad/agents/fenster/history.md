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
