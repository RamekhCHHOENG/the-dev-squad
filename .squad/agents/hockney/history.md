# Project Context

- **Owner:** RamekhCHHOENG
- **Project:** The Dev Squad — a Next.js 16 app that gives Claude its own dev team (Supervisor, Planner, Plan Reviewer, Coder, Tester) with pipeline orchestration and two UI interfaces: Office View and Squad View.
- **Stack:** TypeScript, Next.js 16, React 19, Tailwind CSS v4, Framer Motion, Claude Opus 4.6, Node.js 22+
- **Created:** 2026-04-17
- **Version:** v0.3.17

## Key Files — My Domain

- `src/app/page.tsx` — Office View (full visual dashboard, primary entry)
- `src/app/squad/page.tsx` — Squad View (calmer supervisor-first workspace)
- `src/components/mission/LunarOfficeScene.tsx` — main scene component
- `src/components/mission/PixelSprite.tsx` — pixel art character sprites
- `src/components/shared/CardSkeleton.tsx` — shared loading skeleton
- `src/components/shared/BuildMemoryPanel.tsx` — build memory UI panel (new, untracked)
- `src/lib/use-pipeline.ts` — pipeline state hook, connects UI to API

## Architecture Notes

- Two distinct interfaces sharing the same pipeline hook (`use-pipeline.ts`)
- Office View is the full dashboard with visual agents and status panels
- Squad View is the simpler supervisor-first chat workspace
- Framer Motion handles all transitions — no CSS transitions
- Tailwind CSS v4 with PostCSS — `@tailwindcss/postcss` plugin
- Markdown rendering via `react-markdown` + `remark-breaks`
- `recharts` available for data visualization

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

### 2026-04-17 — E/F agent record map fix

Fixed type regression in `src/app/page.tsx` line 351: the `latestSpeech` prop passed to `<LunarOfficeScene>` was a `Record<AgentId, string | null>` object literal that only included keys `A, B, C, D, S` — missing `E` and `F` after Fenster expanded `AgentId` in `use-pipeline.ts`. Added `E: agentSpeech('E'), F: agentSpeech('F')` to resolve the TS2739 error.

**Agent record map locations:**
- `src/app/page.tsx:351` — `latestSpeech` inline object literal (the one that needed fixing)
- `src/lib/use-pipeline.ts:75` — `EMPTY_STATE.agentStatus` (already had E/F)
- `src/app/squad/page.tsx:11,21` — `AGENT_NAMES` and `AGENT_DESCRIPTIONS` (already had E/F)

### 2026-04-17 — Assigned: Fix page.tsx latestSpeech E/F regression

TypeScript error on page.tsx line 351. latestSpeech Record missing E and F entries. Required fix: add `E: agentSpeech('E'), F: agentSpeech('F')` to the prop object. Once fixed, tsc --noEmit should pass cleanly on feat/build-memory-ef-agents branch. (In progress)


### 2026-04-17 — Tier 2: sendGroup type fix

- `LunarOfficeScene.tsx` `sendGroup` parameter type was too narrow — `"pingpong"` is a valid group and was always used at runtime, type definition just hadn't been updated. Widened the union to include `"pingpong"`.
