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

### 2026-04-17 — Full Project Audit (Keaton)

- **Pipeline is now 6 agents:** E (Security Auditor) and F (DevOps Engineer) added to orchestrator alongside A/B/C/D. Pipeline flow: Plan → Review → Code → Code Review → Security Audit → Test → DevOps → Deploy.
- **Build memory system ships:** `src/lib/build-memory.ts` stores TF-IDF-indexed outcomes from each run at `~/.dev-squad/build-memory.json`. Injected into agent prompts via `buildMemoryContext()`. API + UI panel complete.
- **Runner abstraction exists:** `pipeline/runner.ts` supports host and Docker backends with host-fallback on Docker auth failure. Type `PipelineAgentId` is stale (missing E/F).
- **normalizeState bug:** `src/app/api/state/route.ts` line 27-29 drops `resume-from-code-review` and `resume-from-testing` resume actions — UI won't reflect those states correctly.
- **next build fails type-check:** orchestrator uses `.ts` import extensions which are incompatible with Next.js tsconfig. Need to exclude `pipeline/` from Next.js type checking.
- **No unified test command or CI gate:** 8 individual test scripts exist but no `npm test` or CI workflow runs them.
- **Approval gate hook is well-hardened:** deny-by-default, correctly handles E (no write, no bash) and F (write except plan.md, strict bash approval). WebFetch/WebSearch gated to A/B only.
- **Orchestrator is 1737 lines:** complex but well-structured with clear phase functions. Resume logic handles 6+ distinct resume paths. Getting close to needing extraction into smaller modules.

**Decisions recorded:** 6 decisions escalated to `.squad/decisions.md` — E/F expansion green light, normalizeState fix, PipelineAgentId type update, tsconfig scope fix, unified test suite required.
