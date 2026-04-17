'use client';

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/shared/Badge';

interface BuildMemoryEntry {
  id: string;
  createdAt: string;
  projectName: string;
  concept: string;
  outcome: 'success' | 'partial' | 'failed' | 'cancelled';
  reviewerFindings: string[];
  securityFindings: string[];
  problematicPackages: string[];
  workingPackages: string[];
  lessons: string[];
  durationMinutes?: number;
}

const OUTCOME_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  success: 'success',
  partial: 'warning',
  failed: 'danger',
  cancelled: 'neutral',
};

function RelativeDate({ iso }: { iso: string }) {
  const d = new Date(iso);
  const now = Date.now();
  const diff = Math.floor((now - d.getTime()) / 1000);
  let label: string;
  if (diff < 60) label = 'just now';
  else if (diff < 3600) label = `${Math.floor(diff / 60)}m ago`;
  else if (diff < 86400) label = `${Math.floor(diff / 3600)}h ago`;
  else label = d.toLocaleDateString();
  return <span title={d.toLocaleString()}>{label}</span>;
}

export function BuildMemoryPanel() {
  const [open, setOpen] = useState(false);
  const [memories, setMemories] = useState<BuildMemoryEntry[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchMemories = useCallback(async () => {
    try {
      const res = await fetch('/api/memory');
      if (!res.ok) return;
      const data = await res.json() as { memories: BuildMemoryEntry[] };
      setMemories(data.memories ?? []);
    } catch {}
  }, []);

  useEffect(() => {
    if (!open) return;
    void fetchMemories();
    const t = setInterval(() => { void fetchMemories(); }, 10_000);
    return () => clearInterval(t);
  }, [open, fetchMemories]);

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await fetch(`/api/memory?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      setMemories((prev) => prev.filter((m) => m.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(24,18,33,0.96),rgba(11,10,16,0.98))]">
      {/* Header / Toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Build Memory</span>
          {memories.length > 0 && (
            <span className="rounded-full bg-violet-600/30 px-2 py-0.5 text-[10px] font-bold text-violet-300">
              {memories.length}
            </span>
          )}
        </div>
        <span className="text-slate-600 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-white/10 px-5 pb-5 pt-4">
          {memories.length === 0 ? (
            <p className="text-xs text-slate-500">No build history yet. Memories are saved after each pipeline run.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {memories.map((m) => {
                const isExpanded = expanded.has(m.id);
                const hasDetails =
                  m.reviewerFindings.length > 0 ||
                  m.securityFindings.length > 0 ||
                  m.problematicPackages.length > 0 ||
                  m.workingPackages.length > 0 ||
                  m.lessons.length > 0;

                return (
                  <div key={m.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                    {/* Row 1: project name + outcome badge + date + delete */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white truncate">{m.projectName}</span>
                          <Badge variant={OUTCOME_VARIANT[m.outcome] ?? 'neutral'}>
                            {m.outcome.toUpperCase()}
                          </Badge>
                          {m.durationMinutes != null && (
                            <span className="text-[10px] text-slate-500">{m.durationMinutes}m</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2">{m.concept}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-[10px] text-slate-600"><RelativeDate iso={m.createdAt} /></span>
                        <button
                          onClick={() => handleDelete(m.id)}
                          disabled={deleting === m.id}
                          className="text-[10px] text-slate-600 hover:text-red-400 disabled:opacity-40"
                        >
                          {deleting === m.id ? '…' : '✕'}
                        </button>
                      </div>
                    </div>

                    {/* Row 2: expand toggle if there are details */}
                    {hasDetails && (
                      <button
                        onClick={() => toggleExpand(m.id)}
                        className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-300"
                      >
                        {isExpanded ? 'Hide details ▲' : 'Show details ▼'}
                      </button>
                    )}

                    {/* Row 3: expanded details */}
                    {isExpanded && (
                      <div className="mt-3 flex flex-col gap-2 text-[11px]">
                        {m.reviewerFindings.length > 0 && (
                          <div>
                            <div className="font-bold uppercase tracking-widest text-violet-400 mb-1">Reviewer Findings</div>
                            <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                              {m.reviewerFindings.map((f, i) => <li key={i}>{f}</li>)}
                            </ul>
                          </div>
                        )}
                        {m.securityFindings.length > 0 && (
                          <div>
                            <div className="font-bold uppercase tracking-widest text-red-400 mb-1">Security Findings</div>
                            <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                              {m.securityFindings.map((f, i) => <li key={i}>{f}</li>)}
                            </ul>
                          </div>
                        )}
                        {m.problematicPackages.length > 0 && (
                          <div>
                            <div className="font-bold uppercase tracking-widest text-amber-400 mb-1">Problematic Packages</div>
                            <div className="flex flex-wrap gap-1">
                              {m.problematicPackages.map((p) => (
                                <span key={p} className="rounded bg-amber-900/30 px-1.5 py-0.5 text-amber-300">{p}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {m.workingPackages.length > 0 && (
                          <div>
                            <div className="font-bold uppercase tracking-widest text-emerald-400 mb-1">Working Packages</div>
                            <div className="flex flex-wrap gap-1">
                              {m.workingPackages.map((p) => (
                                <span key={p} className="rounded bg-emerald-900/30 px-1.5 py-0.5 text-emerald-300">{p}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {m.lessons.length > 0 && (
                          <div>
                            <div className="font-bold uppercase tracking-widest text-sky-400 mb-1">Lessons Learned</div>
                            <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                              {m.lessons.map((l, i) => <li key={i}>{l}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
