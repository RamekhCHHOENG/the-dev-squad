# Squad Decisions

## Active Decisions

### 1. The 6-agent pipeline expansion (E + F) is architecturally sound

**Date:** 2026-04-17  
**Author:** Keaton (Lead)  
**Status:** Active  

The addition of Agent E (Security Auditor) and Agent F (DevOps Engineer) is well-integrated:
- Orchestrator routes E↔C and F cleanly between code-review and testing
- Hook permissions are correctly configured for both new agents
- Role files are specific and well-scoped
- JSON schemas follow the existing pattern

**Decision:** Ship the E/F expansion. It adds real value without architectural debt.

---

### 2. normalizeState in state/route.ts has a missing-enum bug

**Date:** 2026-04-17  
**Author:** Keaton (Lead)  
**Status:** Active  

`normalizeState()` only recognizes `continue-approved-plan` and `resume-stalled-turn` for `resumeAction`, but the pipeline now also emits `resume-from-code-review` and `resume-from-testing`. This means the UI will silently drop those resume states to `'none'`, breaking resume visibility for later-phase failures.

**Decision:** Fix this before shipping. Add the two missing resume actions to the normalizer.

---

### 3. runner.ts PipelineAgentId type is stale

**Date:** 2026-04-17  
**Author:** Keaton (Lead)  
**Status:** Active  

`runner.ts` defines `PipelineAgentId = 'A' | 'B' | 'C' | 'D' | 'S'` but orchestrator now uses E and F. This is a type-level inconsistency that would break if strict type checking is applied to runner calls with E/F.

**Decision:** Update the type to include E and F.

---

### 4. Build memory system is a good pattern — keep it

**Date:** 2026-04-17  
**Author:** Keaton (Lead)  
**Status:** Active  

The TF-IDF recall from `build-memory.ts` is lightweight, zero-dependency, and well-tested. It adds cross-run learning without external infrastructure. The API route and UI panel are clean.

**Decision:** Ship as-is. Consider adding a `tags` field later for explicit categorization.

---

### 5. The build currently fails TypeScript checking

**Date:** 2026-04-17  
**Author:** Keaton (Lead)  
**Status:** Active  

`next build` fails because `pipeline/orchestrator.ts` uses `.ts` file extensions in imports, which requires `allowImportingTsExtensions`. This is a known pattern in the project (orchestrator runs via `tsx`, not the Next.js build), but it means `next build` type-checks fail.

**Decision:** Exclude `pipeline/` from the Next.js tsconfig `include` glob, or add a separate `tsconfig.pipeline.json` for CLI tooling. The orchestrator is not a Next.js module — it should not be type-checked by Next.js.

---

### 6. No automated test suite — only individual script tests

**Date:** 2026-04-17  
**Author:** Keaton (Lead)  
**Status:** Active  

There is no unified `npm test` command. Tests are scattered across individual scripts (`test:runner`, `test:hook`, `test:signals`, etc.) with no CI integration. The existing tests pass, but there is no gate preventing regressions.

**Decision:** Add a unified `npm test` that runs all test scripts. Wire it into CI before v0.4.

---

### 7. Test Coverage Gap: pipeline-approval.ts (P1)

**Date:** 2026-04-17  
**Author:** McManus (Tester)  
**Status:** Active  

**File:** `src/lib/pipeline-approval.ts` (144 lines, zero tests)  
**Risk:** High — module owns the approval gate file I/O. No test verifies waitForPendingApproval timing, clearApprovedBashGrant, or findLatestPendingApproval scanning.

**Recommended test:** `scripts/test-pipeline-approval.mjs`

---

### 8. Test Coverage Gap: Hook contract missing agents E and F (P1)

**Date:** 2026-04-17  
**Author:** McManus (Tester)  
**Status:** Active  

**File:** `scripts/test-hook-contract.mjs`  
**Risk:** High — `pipeline-supervisor.ts` already tracks agents E and F; `agent-firewall.sh` rules for E/F have zero regression protection.

**Expected rules to test:**
- E can use StructuredOutput (emits approval/issues)
- E cannot write files or run Bash
- F can write files (generates deployment artifacts)
- F cannot modify `plan.md`
- F cannot run Bash

**Action:** Add test cases for agents E and F.

---

### 9. Test Coverage Gap: pipeline-control.ts (P2)

**Date:** 2026-04-17  
**Author:** McManus (Tester)  
**Status:** Active  

**File:** `src/lib/pipeline-control.ts` (339 lines, zero tests)  
**Risk:** Medium — complex orchestration logic. Most behaviors are pure file I/O — can be tested with a temp directory fixture.

**Recommended test:** `scripts/test-pipeline-control.mjs`

---

### 10. Test Coverage Gap: API memory routes (P2)

**Date:** 2026-04-17  
**Author:** McManus (Tester)  
**Status:** Active  

**File:** `src/app/api/memory/route.ts`  
**Risk:** Medium — HTTP handler layer has no tests. Individual `build-memory.ts` functions are well-tested, but handlers are untested.

**Action:** Add direct handler tests with mock NextRequest objects.

---

### 11. Test Coverage Gap: supervisor snapshot for E/F phases (P2)

**Date:** 2026-04-17  
**Author:** McManus (Tester)  
**Status:** Active  

**File:** `scripts/test-supervisor-snapshot.mjs`  
**Risk:** Medium — snapshot output for `security-audit` and `devops` phases has zero verification.

**Action:** Add 2 snapshot fixtures for phases E and F.

---

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
