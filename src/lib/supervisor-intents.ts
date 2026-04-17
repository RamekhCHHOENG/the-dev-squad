import type { RunGoal, SecurityMode } from '@/lib/pipeline-control';

export type SupervisorIntent =
  | {
      action: 'start-run';
      runGoal?: RunGoal;
      securityMode?: SecurityMode;
      concept?: string;
    }
  | {
      action: 'set-stop-after-review';
      enabled: boolean;
    }
  | {
      action: 'resume-run';
    }
  | {
      action: 'stop-run';
    };

function normalize(message: string): string {
  return message.toLowerCase().trim().replace(/\s+/g, ' ');
}

function extractTrailingConcept(message: string): string {
  const colonIdx = message.indexOf(':');
  if (colonIdx !== -1) {
    return message.slice(colonIdx + 1).trim();
  }

  const forMatch = message.match(/\bfor\b([\s\S]+)$/i);
  return forMatch ? forMatch[1].trim() : '';
}

/**
 * Levenshtein distance between two strings. Used for fuzzy command matching.
 */
function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Returns true if `candidate` is within `threshold` edits of any phrase in `targets`,
 * OR if the candidate contains the target as a substring.
 */
function fuzzyMatch(candidate: string, targets: string[], threshold = 2): boolean {
  for (const target of targets) {
    if (candidate.includes(target)) return true;
    if (candidate.length <= target.length + threshold && editDistance(candidate, target) <= threshold) return true;
  }
  return false;
}

export function parseSupervisorIntent(message: string): SupervisorIntent | null {
  const normalized = normalize(message);
  if (!normalized) return null;

  // ── Stop-after-review toggle ───────────────────────────────────────────────
  // Check "don't/keep/continue" (disable) BEFORE the plain stop check to avoid false positives
  if (
    /\b(keep|continue|dont stop|don't stop|clear)\b.*\b(after review|running)\b/.test(normalized) ||
    /\b(keep running|clear stop after review)\b/.test(normalized) ||
    /\b(dont|don't)\b.*\bstop\b/.test(normalized)
  ) {
    return { action: 'set-stop-after-review', enabled: false };
  }
  if (/\b(stop|pause|hold|wait)\b.*\bafter\b.*\breview\b/.test(normalized)) {
    return { action: 'set-stop-after-review', enabled: true };
  }

  // ── Stop-run ───────────────────────────────────────────────────────────────
  const stopTargets = ['stop', 'stop run', 'stop build', 'stop the build', 'abort', 'abort build', 'cancel build', 'kill run', 'cancel the build', 'kill the run'];
  // Only treat as stop-run if the message is short (not a concept description with "stop" in it)
  if (normalized.split(' ').length <= 6 && fuzzyMatch(normalized, stopTargets, 1)) {
    return { action: 'stop-run' };
  }

  // ── Resume-run ─────────────────────────────────────────────────────────────
  const resumeTargets = [
    'continue', 'continue build', 'continue the build',
    'resume', 'resume build', 'resume the build',
    'send it to c', 'have c start', 'have coder start',
    'resume stalled run', 'resume planner', 'resume reviewer',
    'keep going', 'go ahead', 'proceed', 'approve and continue',
    'looks good continue', 'lgtm continue', 'approve',
  ];
  if (normalized.split(' ').length <= 8 && fuzzyMatch(normalized, resumeTargets, 2)) {
    // Don't match if it looks like "resume after review" or "continue after review" (that's a toggle)
    if (!/after\s+review/.test(normalized)) {
      return { action: 'resume-run' };
    }
  }

  // ── Start-run ──────────────────────────────────────────────────────────────
  const planOnlyHint =
    /\b(plan only|just plan|only plan|plan-only|planner only)\b/.test(normalized) ||
    /^(plan|planning)\b/.test(normalized) ||
    /\b(planner|planning)\b/.test(normalized);

  const fullBuildHint =
    /\b(full build|full run|build it|build the|team|squad|start coding|start building|let's build|lets build)\b/.test(normalized) ||
    /\b(coder|coding)\b/.test(normalized);

  const startTrigger =
    /^(start|begin|launch|run|kick off|kickoff|let's go|lets go|go|build|plan)\b/.test(normalized) ||
    fuzzyMatch(normalized.split(' ')[0], ['start', 'begin', 'launch', 'kickoff'], 1);

  if (normalized === 'plan only' || normalized === 'start planning' || normalized === 'kick off the planner') {
    return { action: 'start-run', runGoal: 'plan-only' };
  }

  if (startTrigger && (planOnlyHint || fullBuildHint)) {
    const concept = extractTrailingConcept(message);
    return {
      action: 'start-run',
      runGoal: planOnlyHint ? 'plan-only' : 'full-build',
      ...(concept ? { concept } : {}),
      ...(/\bstrict\b/.test(normalized) ? { securityMode: 'strict' as const } : /\bfast\b/.test(normalized) ? { securityMode: 'fast' as const } : {}),
    };
  }

  // ── Freeform start: "build me a X" / "make a X" / "create a X" ────────────
  const freeformBuildMatch = normalized.match(/^(build me|make me|create|make|build)\b\s+(.+)/);
  if (freeformBuildMatch) {
    const concept = freeformBuildMatch[2].trim();
    // Only treat as a start-run if the concept is long enough to be meaningful
    if (concept.length >= 8) {
      return {
        action: 'start-run',
        runGoal: 'full-build',
        concept,
        ...(/\bstrict\b/.test(normalized) ? { securityMode: 'strict' as const } : /\bfast\b/.test(normalized) ? { securityMode: 'fast' as const } : {}),
      };
    }
  }

  return null;
}
