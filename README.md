# The Dev Squad

![The Dev Squad](demo.gif)

5 Claude Code sessions that talk to each other to build software.

One plans. One reviews. One codes. One tests. One supervises. They communicate through structured signals, review each other's work, and loop until every step is right. The result is bulletproof plans that produce bulletproof builds.

No API keys. No per-token costs. All 5 sessions run on your Claude subscription. You describe what you want, and the team builds it — start to finish — without errors.

## Why This Exists

I was spending hours writing build plans. Not specs — full plans with complete, copy-pasteable code for every file. I found that if the plan was bulletproof, the build was bulletproof. No guessing, no improvising, no "I'll figure it out during implementation." The coder just follows the plan.

But writing those plans was brutal. I'd go back and forth with Claude — "is this thorough enough?", "did you verify this package exists?", "what about error handling?" — until the session would lose context. I'd open a new session, paste the plan, keep going. Then I'd open another session for the reviewer, another for the coder, another for testing. I was manually orchestrating 4-5 Claude sessions, copying messages between them.

The Dev Squad is what happens when you automate that. The planner writes the plan with complete code — not descriptions, not pseudocode, actual code. The reviewer tears it apart and loops with the planner until there are zero gaps. Only then does the coder touch it. The coder doesn't think — it follows the plan exactly. The tester doesn't guess — it checks every item against the plan.

The key insight: **the plan IS the code**. Agent A doesn't write a spec sheet. A writes a plan that contains every line of code the coder will need. The reviewer's job is to make sure that plan is so complete that the coder never has to ask a single question. That's what makes the builds bulletproof — by the time C starts coding, every decision has already been made and verified.

I built a template and checklist that A follows — research, verify from source, write complete code, self-review, fill gaps. A can't skip steps. B can't approve until every question is answered. The pipeline enforces quality at every stage so I don't have to.

My rule: the plan must be 100% bulletproof with zero errors and evidence to verify every decision before I move forward with a build. No "this should work." No "I think this package exists." Every claim is verified from source. Every code block is complete and tested in the planner's head before the coder ever sees it.

The result: builds come out with no errors. I used to spend hours after a build going back and fixing things — missing dependencies, wrong API signatures, broken imports. Now, 99% of the time, the build produces exactly what I asked for. On the rare occasion something needs troubleshooting, every agent still has complete context because we didn't burn through the session going in circles. The planner remembers the concept. The coder remembers what it built. The tester remembers what it tested. Nobody lost context because each agent only did its one job.

This saves me hours every day.

## The Agents

| Agent | Role | What It Does |
|-------|------|-------------|
| **A** | Planner | Chats with you about the concept, researches everything, writes a build plan with complete code for every file |
| **B** | Reviewer | Reads A's plan and tears it apart. Asks hard questions. Loops with A until there are zero gaps. |
| **C** | Coder | Follows the approved plan exactly. Writes every file, installs deps, builds the project. No improvising. |
| **D** | Tester | Reviews C's code against the plan, runs it, catches bugs. Loops with C until everything passes. |
| **S** | Supervisor | Your diagnostic assistant. If something breaks or loops, S reads the event log and helps figure out what went wrong. |

Each agent is a separate Claude Code session running Claude Opus 4.6. They communicate through structured JSON signals routed by an orchestrator. Every restriction is enforced by a `PreToolUse` hook — the agents literally cannot break the rules.

## How It Works

```
1. Open the viewer
2. Chat with Agent A — describe what you want to build
3. Hit START
4. Watch 5 agents build it autonomously
5. Your project is in ~/Builds/
```

**Phase 0: Concept** — You talk to Agent A. Describe what you want. A asks clarifying questions until the scope is clear. This is the only human interaction required.

**Phase 1: Planning** — A reads the build plan template, researches the concept (web searches, docs, source code), and writes `plan.md` with complete, copy-pasteable code for every file. No placeholders. A self-reviews multiple times before sending to B.

**Phase 1b: Plan Review** — B reads the plan and sends structured questions back to A. They loop until B is fully satisfied and approves. The plan is locked. No agent can modify it.

**Phase 2: Coding** — C reads the locked plan and builds exactly what it says. Every file, every dependency, every line of code.

**Phase 3: Code Review + Testing** — D reads the plan and the code. Checks every item. If anything doesn't match or fails, D sends issues back to C. They loop until D approves and all tests pass.

**Phase 4: Deploy** — The finished project is ready.

The plan-review loop between A and B catches design gaps before a single line of code is written. The test loop between C and D catches implementation bugs before anything ships. Each loop has no round limit — they keep going until it's right.

## The Viewer

A pixel art office where 5 agents sit at desks. You watch them work in real-time:

- **Live Feed** — Every event from every agent, timestamped and color-coded
- **Dashboard** — Phase progress, token usage, elapsed time, file count, errors, cost
- **5-Panel Grid** — S (supervisor) panel on the left, A/B/C/D on the right. Each panel shows that agent's activity with auto-scroll. Click any panel to expand.
- **Per-Panel Chat** — Each panel has its own input. Talk directly to any agent.
- **Controls** — START, STOP, Reset, View Plan

When idle, agents wander the office, visit the hookah lounge, and play ping pong.

## Requirements

- **Claude Code CLI** — this is the engine. You must have the `claude` command installed and working in your terminal. Install it from [claude.ai/code](https://claude.ai/code).
- **Active Claude subscription** — Max, Pro, or Team. All 5 agent sessions run on your subscription. No API key needed.
- **Node.js 22+**
- **pnpm**

## Installation

```bash
git clone https://github.com/johnkf5-ops/the-dev-squad.git
cd the-dev-squad
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

That's it. The viewer handles everything — spawning agents, running the orchestrator, managing builds.

## How to Use

### The UI

The screen is split into two sections:

**Top half** — A pixel art office with 5 agents at desks. They animate in real-time as they work. Below the office is a live feed showing every event from every agent. To the right is a dashboard with phase progress, token usage, elapsed time, and controls.

**Bottom half** — A 5-panel grid. The **S (Supervisor)** panel spans the left column. The **A, B, C, D** panels fill the right in a 2x2 grid. Each panel shows that agent's activity and has its own chat input at the bottom.

### Step by Step

**1. Reset** — Click the **Reset** button to clear any previous session. This gives you a clean slate.

**2. Talk to the Planner** — Click on **Agent A's panel** (top-left of the 4-panel grid, labeled "Planner"). Type your concept in the chat input at the bottom of A's panel and hit Send. Tell A what you want to build. A will ask clarifying questions — answer them until A says it's ready.

**3. Start the Pipeline** — Click **START**. The orchestrator takes over. A writes the plan, B reviews it, C codes it, D tests it. You watch it all happen in real-time across the panels.

**4. Watch** — Each panel auto-scrolls as events come in. Click any A-D panel to expand it into a full scrollable modal for more detail. The dashboard shows which phase you're in and tracks progress.

**5. Stop (if needed)** — Click **STOP** at any time to abort the pipeline. This kills the orchestrator and all agent sessions immediately.

**6. View Plan** — Once A has written the plan, a **View Plan** button appears. Click it to read the full build plan in a modal.

**7. Done** — When the pipeline completes, your project is in `~/Builds/<project-name>/`. The dashboard shows "COMPLETE" and you'll hear a notification chime.

### After the Build

Once the build is complete, you can chat directly with any agent for post-build work. Click on C's panel and ask it to fix a bug. Click on D's panel and ask it to run more tests. Each agent retains context from the build.

### The Supervisor (S Panel)

The S panel on the left is **not** part of the pipeline. S is your diagnostic assistant. If something breaks, stalls, or loops, type in the S panel to ask what went wrong. S can read the event log, the plan, the code, and help you figure out the issue. You don't need to use S during a normal build — it's there when things go sideways.

### Controls Reference

| Button | What It Does |
|--------|-------------|
| **START** | Creates a project directory from your concept, spawns the orchestrator, begins the autonomous pipeline |
| **STOP** | Kills the orchestrator and all active agent sessions immediately |
| **Reset** | Stops everything, clears the staging area, resets any stuck projects. Use before starting a new build. |
| **View Plan** | Opens the current `plan.md` in a modal (appears after A writes the plan) |

## Security

Agents are constrained by hooks, not prompts. A `PreToolUse` hook gates every tool call:

| Agent | Can Write | Can Run Bash | Can Spawn Agents |
|-------|-----------|-------------|-----------------|
| A (Planner) | `plan.md` only | No | No |
| B (Reviewer) | Nothing | No | No |
| C (Coder) | Inside `~/Builds/` (except `plan.md`) | Yes (dangerous cmds need approval) | No |
| D (Tester) | Nothing | Yes (dangerous cmds need approval) | No |
| S (Supervisor) | Unrestricted | Yes | No |

Additional protections:
- No agent can write outside `~/Builds/`
- Plan is locked after B approves — no agent can modify it
- Safe bash commands auto-approve, dangerous ones require your click
- All sessions use `--permission-mode auto` for Claude's built-in safety classifier

## Project Structure

```
the-dev-squad/
  src/
    app/
      page.tsx                      # Main page — dashboard, panels, controls
      api/                          # API routes (chat, start, stop, reset, state)
    components/
      mission/                      # Pixel art office scene
    lib/
      use-pipeline.ts               # React hook — polls state, exposes actions
  pipeline/
    orchestrator.ts                 # Spawns agents, routes signals, enforces flow
    .claude/hooks/approval-gate.sh  # Per-agent permission enforcement
    role-a.md, role-b.md, etc.      # Agent role context files
    build-plan-template.md          # Template A follows when writing plans
  public/
    sprites/                        # Agent character sprites
    ...                             # Office environment assets
```

## How Agents Communicate

Agents communicate via structured JSON — no text parsing:

```json
// B reviewing A's plan
{ "status": "approved" }
{ "status": "questions", "questions": ["What about error handling?"] }

// D reviewing C's code
{ "status": "approved" }
{ "status": "issues", "issues": ["Missing input validation"] }

// D testing
{ "status": "passed" }
{ "status": "failed", "failures": ["PUT /users returns 500"] }
```

The orchestrator routes these signals between agents and advances the pipeline when an approval is received.

## License

MIT

---

Built with Claude Code. Runs on Claude Code. No API required.
