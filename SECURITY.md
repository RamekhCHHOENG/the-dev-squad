# Security

## Threat Model

The hook system prevents agents from **accidentally drifting out of their lane** during normal pipeline operation. It is NOT a security sandbox against adversarial or jailbreak-prone models.

If your threat model requires defense against a hostile agent, you need OS-level isolation (containers, chroot, seccomp) — not a bash hook.

## Hook Enforcement Model

Agent permissions are enforced by a `PreToolUse` hook (`pipeline/.claude/hooks/approval-gate.sh`), not by prompts. The hook runs before every tool call for every agent. Prompts provide context — the hook provides guardrails.

## What the Hook Catches

The hook reliably prevents:

- **Accidental writes outside `~/Builds/`** — path prefix check with trailing slash, canonicalized via `readlink -f`
- **Accidental writes to `.claude/` config** — case pattern blocks Write/Edit/NotebookEdit to `.claude/` paths
- **Agent A writing code files** — only `plan.md` allowed
- **Agents B and D writing anything** — all writes blocked
- **Agent C modifying `plan.md`** — locked after review
- **Agents A and B running Bash** — blocked entirely
- **Any agent spawning sub-agents** — Agent tool blocked for all
- **Path traversal via `..`** — rejected before resolution
- **Unknown agent identity** — rejected if not A/B/C/D/S
- **Unrecognized tools** — deny-by-default catch-all
- **Missing/malformed tool names** — rejected on parse
- **Phase 0 writes by Agent A** — blocked, defaults to blocked if events file missing
- **Symlink-based path escapes** — resolved via `readlink -f`

## What the Hook Does NOT Catch

These are known, documented limitations that cannot be fully solved with a bash hook:

**Indirect execution bypass (V3 — OPEN)**
Agents with Bash access (C, D, S) can use `python3 -c`, `eval`, `base64`, or other indirect methods to invoke Claude or modify files in ways the pattern filters don't catch. The hook blocks direct `claude -p` and `PIPELINE_AGENT` strings, but cannot prevent all forms of indirect execution. This is fundamentally a blocklist-vs-allowlist problem — you cannot enumerate every way to invoke a program from bash.

**Hardlink bypass (V2/V4 — PARTIALLY MITIGATED)**
The hook blocks `ln` commands and resolves symlinks via `readlink -f`, but `readlink -f` does not detect hardlinks. If a hardlink to an external file exists inside `~/Builds/`, the hook will allow writes to it. The `ln` block prevents agents from creating new hardlinks, but cannot detect pre-existing ones. Creating hardlinks via indirect execution (python, etc.) is also possible.

**Glob-based `.claude/` bypass (V1 — PARTIALLY MITIGATED)**
The hook blocks `mv`/`cp`/`rm` with dot-file glob patterns and direct `.claude` references. However, sufficiently creative glob patterns or indirect shell expansion could evade the filters. Moving the hook outside the agent-writable tree would be the correct fix.

**Cross-project writes (P1 — FIXED)**
Agents A-D are now jailed to their current project directory (CWD), not all of `~/Builds/`. Agent S retains access to all of `~/Builds/` for diagnostics.

**TOCTOU race conditions**
The hook resolves file paths at check time. Between the check and the actual tool execution, symlinks could be retargeted. This is a fundamental limitation of check-then-act in a separate process.

**WebSearch exfiltration (ACCEPTED RISK)**
Agent A has WebSearch access for research. Search queries go to the internet and could leak small amounts of information. This is an accepted tradeoff — A needs web access to research build concepts. All other agents are blocked from WebSearch and WebFetch.

## What Requires What

Docker is one way to get stronger isolation, but it is not the only way. Containers, chroot jails, VMs, macOS App Sandbox, or other OS-enforced isolation can all serve the same role.

| Issue | Fixable in Hook? | Needs Design / Permission Change? | Needs OS Isolation for Strong Guarantee? |
|-------|------------------|-----------------------------------|------------------------------------------|
| Cross-project writes under `~/Builds/` | Yes — **FIXED** | No | No |
| Agent A WebSearch exfiltration | No | Yes — reduce, proxy, or remove web access | No |
| Indirect execution via `python3 -c`, `eval`, base64, etc. | No | Yes — remove Bash, require approval for all Bash, or replace shell access with allowlisted operations | Yes, if Bash must remain available |
| Hardlink bypass | Partial mitigation only | Yes — move protected files out of agent-writable trees and reduce shell/file authority | Yes, if you need a reliable guarantee |
| TOCTOU race between check and tool execution | No | Partial mitigation only | Yes |

In short:

- **Fix in hook:** cross-project writes
- **Fix by changing permissions/product design:** indirect execution and WebSearch risk
- **Needs OS-level isolation for a strong guarantee:** hardlinks and TOCTOU, and indirect execution if Bash remains available

## Current Permission Matrix

| Agent | Read | Write | Bash | WebSearch | WebFetch | Agent Tool |
|-------|------|-------|------|-----------|----------|------------|
| S | Anywhere | `~/Builds/` only (no `.claude/`) | Yes (pattern-restricted) | No | No | No |
| A | Anywhere | `plan.md` only in `~/Builds/` (no Phase 0) | No | Yes | No | No |
| B | Anywhere | No | No | No | No | No |
| C | Anywhere | `~/Builds/` (no `plan.md`, no `.claude/`) | Yes (pattern-restricted) | No | No | No |
| D | Anywhere | No | Yes (pattern-restricted) | No | No | No |

## Recommended Hardening (Future)

For stronger isolation:
1. **Per-project write jail** — restrict writes to the active project directory, not all of `~/Builds/`
2. **Docker containers or equivalent OS sandbox** — run each agent session in an isolated environment with only the intended project directory writable
3. **Remove Bash for C/D** — require human approval for all bash commands, not just dangerous ones
4. **Move `.claude/` outside `~/Builds/`** — put hooks and settings in a location agents can never reach
5. **Allowlist over blocklist** — instead of blocking bad bash patterns, only allow specific safe commands

## Reporting

If you find a security issue, please open a private issue or contact the maintainer directly.
