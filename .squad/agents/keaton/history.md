# Project Context

- **Owner:** RamekhCHHOENG
- **Project:** The Dev Squad — a Next.js 16 app that gives Claude its own dev team (Supervisor, Planner, Plan Reviewer, Coder, Tester) with pipeline orchestration and two UI interfaces: Office View and Squad View.
- **Stack:** TypeScript, Next.js 16, React 19, Tailwind CSS v4, Framer Motion, Claude Opus 4.6, Node.js 22+
- **Created:** 2026-04-17
- **Version:** v0.3.17

## Key Files

- `pipeline/orchestrator.ts` — pipeline orchestration engine
- `pipeline/role-{a-f}.md` — role prompt files for each pipeline agent
- `src/app/page.tsx` — Office View (full visual dashboard)
- `src/app/squad/page.tsx` — Squad View (supervisor-first workspace)
- `src/app/api/chat/route.ts` — Supervisor chat API
- `src/app/api/state/route.ts` — Pipeline state API
- `src/lib/pipeline-supervisor.ts` — supervisor logic
- `src/lib/supervisor-intents.ts` — intent parsing
- `src/lib/pipeline-control.ts` — pipeline control
- `src/lib/pipeline-planning.ts` — planning logic
- `src/lib/build-memory.ts` — build memory system (new)
- `pipeline/.claude/hooks/approval-gate.sh` — PreToolUse approval hook

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->
