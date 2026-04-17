import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { NextRequest, NextResponse } from 'next/server';
import { EMPTY_RUNTIME } from '@/lib/pipeline-runtime';

const BUILDS_DIR = join(homedir(), 'Builds');
const STAGING_DIR = join(BUILDS_DIR, '.staging');
const MANUAL_DIR = join(BUILDS_DIR, '.manual');

const EMPTY_STATE = {
  concept: '', projectDir: '', currentPhase: 'concept', securityMode: 'fast', runGoal: 'full-build', stopAfterPhase: 'none', pipelineStatus: 'idle', activeAgent: '',
  agentStatus: { A: 'idle', B: 'idle', C: 'idle', D: 'idle', E: 'idle', F: 'idle', S: 'idle' },
  sessions: {}, buildComplete: false,
  usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, totalCostUsd: 0 },
  runtime: { ...EMPTY_RUNTIME },
  events: [],
};

function normalizeState(data: Record<string, unknown>) {
  return {
    ...EMPTY_STATE,
    ...data,
    securityMode: data.securityMode === 'strict' ? 'strict' : 'fast',
    runGoal: data.runGoal === 'plan-only' ? 'plan-only' : 'full-build',
    stopAfterPhase: data.stopAfterPhase === 'plan-review' ? 'plan-review' : 'none',
    resumeAction: data.resumeAction === 'continue-approved-plan' || data.resumeAction === 'resume-stalled-turn' || data.resumeAction === 'resume-from-code-review' || data.resumeAction === 'resume-from-testing'
      ? data.resumeAction
      : 'none',
    pipelineStatus: typeof data.pipelineStatus === 'string'
      ? data.pipelineStatus
      : (data.buildComplete ? 'complete' : (data.currentPhase && data.currentPhase !== 'concept' ? 'running' : 'idle')),
    agentStatus: { ...EMPTY_STATE.agentStatus, ...(data.agentStatus as Record<string, string> | undefined) },
    usage: { ...EMPTY_STATE.usage, ...(data.usage as Record<string, number> | undefined) },
    runtime: data.runtime && typeof data.runtime === 'object' ? data.runtime : { ...EMPTY_RUNTIME },
    events: Array.isArray(data.events) ? data.events : [],
  };
}

function findLatestProject(): string | null {
  try {
    const dirs = readdirSync(BUILDS_DIR)
      .filter(name => name !== '.staging' && name !== '.manual')
      .map(name => join(BUILDS_DIR, name))
      .filter(p => {
        try { return statSync(p).isDirectory() && statSync(join(p, 'pipeline-events.json')).isFile(); }
        catch { return false; }
      })
      .sort((a, b) => statSync(join(b, 'pipeline-events.json')).mtimeMs - statSync(join(a, 'pipeline-events.json')).mtimeMs);
    return dirs[0] || null;
  } catch { return null; }
}

/** Slice events for the response. `since` = cursor (client's known total count).
 *  No cursor → return last INITIAL_EVENT_LIMIT events so the first load is fast.
 *  With cursor → return only events added since that cursor. */
const INITIAL_EVENT_LIMIT = 300;

function sliceEvents(
  normalized: ReturnType<typeof normalizeState>,
  since: number | null,
): ReturnType<typeof normalizeState> & { totalEvents: number } {
  const all = normalized.events;
  const totalEvents = all.length;
  const events =
    since !== null && since >= 0 && since <= totalEvents
      ? all.slice(since)
      : all.slice(-INITIAL_EVENT_LIMIT);
  return { ...normalized, events, totalEvents };
}

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('mode') || 'pipeline';
  const sinceParam = req.nextUrl.searchParams.get('since');
  const since = sinceParam !== null ? parseInt(sinceParam, 10) : null;

  /** Sentinel returned when the file can't be read (partial write / race).  
   *  Client keeps its current accumulated state unchanged. */
  const NO_CHANGE = (knownSince: number | null) =>
    NextResponse.json({ noChange: true, totalEvents: knownSince ?? 0 });

  // Manual mode — read from .manual directory
  if (mode === 'manual') {
    const manualEvents = join(MANUAL_DIR, 'manual-state.json');
    if (existsSync(manualEvents)) {
      try {
        const data = JSON.parse(readFileSync(manualEvents, 'utf8'));
        return NextResponse.json(sliceEvents(normalizeState(data), since));
      } catch {
        return NO_CHANGE(since);
      }
    }
    return NextResponse.json({ ...EMPTY_STATE, totalEvents: 0 });
  }

  // Pipeline mode — check staging first, then real projects
  const stagingEvents = join(STAGING_DIR, 'pipeline-events.json');
  if (existsSync(stagingEvents)) {
    try {
      const data = JSON.parse(readFileSync(stagingEvents, 'utf8'));
      return NextResponse.json(sliceEvents(normalizeState(data), since));
    } catch {
      return NO_CHANGE(since);
    }
  }

  const projectDir = findLatestProject();
  if (!projectDir) {
    return NextResponse.json({ ...EMPTY_STATE, totalEvents: 0 });
  }

  try {
    const raw = JSON.parse(readFileSync(join(projectDir, 'pipeline-events.json'), 'utf8'));
    const data = normalizeState(raw);
    const pipelineStatus = data.pipelineStatus;
    const isVisible =
      pipelineStatus === 'running' ||
      pipelineStatus === 'paused' ||
      pipelineStatus === 'failed' ||
      pipelineStatus === 'complete' ||
      !!data.buildComplete;
    if (isVisible) {
      return NextResponse.json(sliceEvents(data, since));
    }
    return NextResponse.json({ ...EMPTY_STATE, totalEvents: 0 });
  } catch {
    // File was mid-write — tell the client to keep its current state.
    return NO_CHANGE(since);
  }
}
