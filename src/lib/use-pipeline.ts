'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import type { PipelineRuntimeState } from '@/lib/pipeline-runtime';

export type AgentId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'S';
export type Phase = 'concept' | 'planning' | 'plan-review' | 'coding' | 'code-review' | 'security-audit' | 'testing' | 'devops' | 'deploy' | 'complete';
export type AppMode = 'pipeline' | 'manual';
export type SecurityMode = 'fast' | 'strict';
export type PermissionMode = 'auto' | 'plan' | 'dangerously-skip-permissions';
export type RunGoal = 'full-build' | 'plan-only';
export type StopAfterPhase = 'none' | 'plan-review';
export type PipelineStatus = 'idle' | 'running' | 'paused' | 'complete' | 'failed';
export type ResumeAction = 'none' | 'continue-approved-plan' | 'resume-stalled-turn' | 'resume-from-code-review' | 'resume-from-testing';

export interface PipelineEvent {
  time: string;
  agent: AgentId | 'system';
  phase: string;
  type: string;
  text: string;
  detail?: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalCostUsd: number;
}

export interface PipelineState {
  concept: string;
  projectDir: string;
  currentPhase: Phase;
  securityMode: SecurityMode;
  runGoal: RunGoal;
  stopAfterPhase: StopAfterPhase;
  pipelineStatus: PipelineStatus;
  resumeAction?: ResumeAction;
  activeAgent: string;
  agentStatus: Record<AgentId, string>;
  sessions: Record<string, string>;
  buildComplete: boolean;
  usage: TokenUsage;
  runtime?: PipelineRuntimeState;
  events: PipelineEvent[];
}

export interface PendingApproval {
  requestId: string;
  projectDir: string;
  agent: AgentId | string;
  tool: string;
  input: Record<string, unknown>;
  description: string;
  createdAt: string;
  approved: boolean | null;
  sessionId?: string;
  phase?: string;
  reason?: string;
}

const EMPTY_STATE: PipelineState = {
  concept: '',
  projectDir: '',
  currentPhase: 'concept',
  securityMode: 'fast',
  runGoal: 'full-build',
  stopAfterPhase: 'none',
  pipelineStatus: 'idle',
  resumeAction: 'none',
  activeAgent: '',
  agentStatus: { A: 'idle', B: 'idle', C: 'idle', D: 'idle', E: 'idle', F: 'idle', S: 'idle' },
  sessions: {},
  buildComplete: false,
  usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, totalCostUsd: 0 },
  runtime: { activeTurn: null },
  events: [],
};

interface UsePipelineOptions {
  pollInterval?: number;
  mode: AppMode;
  model: string;
}

interface SendChatOptions {
  securityMode?: SecurityMode;
  permissionMode?: PermissionMode;
  runGoal?: RunGoal;
}

/** Max events kept in memory on the client. Oldest are dropped beyond this cap. */
const MAX_CLIENT_EVENTS = 2000;

/** Fast poll interval while running; slow interval when idle/paused/complete. */
const SLOW_INTERVAL = 2000;

export function usePipelineState({ pollInterval = 400, mode, model }: UsePipelineOptions) {
  const [state, setState] = useState<PipelineState>(EMPTY_STATE);
  const [error, setError] = useState<string | null>(null);

  // Incremental event accumulation — avoids re-fetching the entire event log every poll.
  const eventOffsetRef = useRef<number>(0);        // server's totalEvents we've consumed
  const accumulatedRef = useRef<PipelineEvent[]>([]); // full local event buffer
  const initializedRef = useRef<boolean>(false);   // whether first poll has completed
  // Lightweight state signature — used to skip setState when nothing changed.
  const sigRef = useRef<string>('');

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const since = initializedRef.current ? `&since=${eventOffsetRef.current}` : '';
        const res = await fetch(`/api/state?mode=${mode}${since}&_=${Date.now()}`);
        if (!res.ok) return;
        const data = await res.json() as (PipelineState & { totalEvents?: number; noChange?: boolean }) | null;
        if (!active || !data || typeof data !== 'object') return;

        // Server signals a transient read error (e.g. file mid-write) — keep current state.
        if (data.noChange) return;

        const serverTotal: number = typeof data.totalEvents === 'number' ? data.totalEvents : (data.events?.length ?? 0);
        const newEvents: PipelineEvent[] = data.events ?? [];

        // Detect a genuine reset (new project / explicit reset), not a transient empty.
        // Only reset when serverTotal is 0 AND the response has real state fields (not empty sentinel).
        const isGenuineReset = serverTotal < eventOffsetRef.current && serverTotal === 0 && !data.projectDir;
        if (isGenuineReset || !initializedRef.current) {
          accumulatedRef.current = newEvents;
        } else if (serverTotal > eventOffsetRef.current) {
          // New events available — append delta.
          const next = accumulatedRef.current.concat(newEvents);
          accumulatedRef.current = next.length > MAX_CLIENT_EVENTS
            ? next.slice(next.length - MAX_CLIENT_EVENTS)
            : next;
        }
        // serverTotal === eventOffsetRef.current → no new events, nothing to append.

        eventOffsetRef.current = serverTotal;
        initializedRef.current = true;

        // Skip setState (and the re-render cascade) if nothing meaningful changed.
        const sig = `${data.pipelineStatus}|${data.activeAgent}|${data.buildComplete}|${data.currentPhase}|${data.resumeAction}|${JSON.stringify(data.agentStatus)}|${serverTotal}`;
        if (sig !== sigRef.current) {
          sigRef.current = sig;
          setState({ ...data, events: accumulatedRef.current });
        }
        setError(null);
      } catch (err) {
        if (active) setError(String(err));
      }
    }

    async function schedulePoll() {
      await poll();
      if (!active) return;
      // Adaptive delay: fast when pipeline is actively running, slow otherwise.
      const status = sigRef.current.split('|')[0];
      const delay = status === 'running' ? pollInterval : SLOW_INTERVAL;
      timer = setTimeout(schedulePoll, delay);
    }

    void schedulePoll();
    return () => { active = false; clearTimeout(timer); };
  }, [pollInterval, mode]);

  const sendChat = useCallback(async (agent: AgentId, message: string, options?: SendChatOptions) => {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent,
        message,
        mode,
        model,
        securityMode: options?.securityMode,
        permissionMode: options?.permissionMode,
        runGoal: options?.runGoal,
      }),
    });
    return res.json();
  }, [mode, model]);

  const startPipeline = useCallback(async (securityMode: SecurityMode, runGoal: RunGoal, permissionMode?: PermissionMode) => {
    const res = await fetch('/api/start-pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ securityMode, permissionMode, runGoal }),
    });
    return res.json();
  }, []);

  const resumePipeline = useCallback(async () => {
    const res = await fetch('/api/resume-pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
  }, []);

  const setStopAfterReview = useCallback(async (enabled: boolean) => {
    const res = await fetch('/api/pipeline-control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: enabled ? 'stop-after-review' : 'clear-stop-after-review',
      }),
    });
    return res.json();
  }, []);

  const stopPipeline = useCallback(async () => {
    const res = await fetch('/api/stop-pipeline', { method: 'POST' });
    return res.json();
  }, []);

  const approveBash = useCallback(async (approved: boolean, pending?: PendingApproval | null) => {
    const res = await fetch('/api/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        approved,
        requestId: pending?.requestId,
        projectDir: pending?.projectDir,
      }),
    });
    return res.json();
  }, []);

  const getPlan = useCallback(async () => {
    const res = await fetch('/api/plan');
    if (!res.ok) return null;
    const data = await res.json();
    return data.content as string | null;
  }, []);

  const resetState = useCallback(async () => {
    const res = await fetch('/api/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
    const data = await res.json();
    if (data?.ok) {
      // Flush incremental state so the next poll starts fresh.
      eventOffsetRef.current = 0;
      accumulatedRef.current = [];
      initializedRef.current = false;
      setState(EMPTY_STATE);
      setError(null);
    }
    return data;
  }, [mode]);

  // Build a per-agent event map once per events update — O(n) total, O(1) per-panel lookup.
  const agentEventMap = useMemo(() => {
    const map: Partial<Record<string, PipelineEvent[]>> = {};
    for (const e of state.events) {
      const key = e.agent as string;
      if (!map[key]) map[key] = [];
      map[key]!.push(e);
    }
    return map;
  }, [state.events]);

  // Get events for a specific agent
  const agentEvents = useCallback((agent: AgentId) => {
    return agentEventMap[agent] ?? [];
  }, [agentEventMap]);

  // Get latest speech for an agent (for bubble display)
  const agentSpeech = useCallback((agent: AgentId): string | null => {
    const events = (agentEventMap[agent] ?? []).filter(
      e => e.type === 'text' || e.type === 'status' || e.type === 'tool_call',
    );
    if (events.length === 0) return null;
    const last = events[events.length - 1];
    return last.text.length > 80 ? last.text.slice(0, 77) + '...' : last.text;
  }, [agentEventMap]);

  return {
    state,
    error,
    sendChat,
    startPipeline,
    resumePipeline,
    stopPipeline,
    setStopAfterReview,
    approveBash,
    getPlan,
    resetState,
    agentEvents,
    agentSpeech,
  };
}
