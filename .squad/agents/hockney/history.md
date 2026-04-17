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
