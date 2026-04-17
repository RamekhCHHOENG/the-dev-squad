/**
 * Build Memory — cross-run knowledge store for The Dev Squad.
 *
 * Stores structured outcome records from each completed pipeline run and
 * retrieves relevant past knowledge before a new run starts.
 *
 * Storage: a single JSON file at ~/.dev-squad/build-memory.json
 * No external dependencies — works offline, zero setup required.
 *
 * The retrieval is keyword + TF-IDF similarity so agents get the most
 * relevant past learnings injected into their system prompt.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const MEMORY_DIR = join(homedir(), '.dev-squad');
const MEMORY_FILE = join(MEMORY_DIR, 'build-memory.json');
const MAX_MEMORIES = 200;      // cap to avoid unbounded growth
const MAX_RECALL = 5;          // memories surfaced per query

// ── Types ────────────────────────────────────────────────────────────────────

export type BuildOutcome = 'success' | 'partial' | 'failed' | 'cancelled';

export interface BuildMemoryEntry {
  id: string;
  createdAt: string;
  projectName: string;
  concept: string;
  outcome: BuildOutcome;
  /** What the plan reviewer flagged — persists across runs */
  reviewerFindings: string[];
  /** Security findings from Agent E */
  securityFindings: string[];
  /** Packages/deps that caused problems */
  problematicPackages: string[];
  /** Packages/deps that worked well */
  workingPackages: string[];
  /** Free-form lessons learned, written by the orchestrator at run end */
  lessons: string[];
  /** Duration in minutes */
  durationMinutes?: number;
}

interface MemoryStore {
  version: 1;
  entries: BuildMemoryEntry[];
}

// ── Storage helpers ──────────────────────────────────────────────────────────

function ensureDir() {
  if (!existsSync(MEMORY_DIR)) {
    mkdirSync(MEMORY_DIR, { recursive: true });
  }
}

function readStore(): MemoryStore {
  ensureDir();
  if (!existsSync(MEMORY_FILE)) {
    return { version: 1, entries: [] };
  }
  try {
    return JSON.parse(readFileSync(MEMORY_FILE, 'utf8')) as MemoryStore;
  } catch {
    return { version: 1, entries: [] };
  }
}

function writeStore(store: MemoryStore) {
  ensureDir();
  writeFileSync(MEMORY_FILE, JSON.stringify(store, null, 2));
}

// ── TF-IDF similarity (no external deps) ────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
  'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his',
  'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'use', 'way',
  'who', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use', 'with',
  'that', 'this', 'from', 'they', 'been', 'have', 'more', 'will', 'also',
  'into', 'just', 'like', 'make', 'over', 'such', 'than', 'them', 'then',
  'time', 'very', 'when', 'were', 'what', 'your',
]);

function keywords(tokens: string[]): string[] {
  return tokens.filter((t) => !STOP_WORDS.has(t));
}

function entryToText(entry: BuildMemoryEntry): string {
  return [
    entry.concept,
    entry.projectName,
    ...entry.reviewerFindings,
    ...entry.securityFindings,
    ...entry.problematicPackages,
    ...entry.workingPackages,
    ...entry.lessons,
  ].join(' ');
}

function score(queryTokens: string[], entryText: string): number {
  const entryTokens = keywords(tokenize(entryText));
  const entrySet = new Map<string, number>();
  for (const t of entryTokens) entrySet.set(t, (entrySet.get(t) ?? 0) + 1);

  let hits = 0;
  let weightedHits = 0;
  for (const qt of queryTokens) {
    const freq = entrySet.get(qt) ?? 0;
    if (freq > 0) {
      hits++;
      weightedHits += Math.log(1 + freq);
    }
  }
  if (hits === 0) return 0;
  // Jaccard-inspired: overlap / union, boosted by TF weight
  const union = new Set([...queryTokens, ...entryTokens]).size;
  return (hits / union) + weightedHits * 0.1;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Save a build memory entry at the end of a pipeline run.
 */
export function saveMemory(entry: Omit<BuildMemoryEntry, 'id' | 'createdAt'>) {
  const store = readStore();
  const full: BuildMemoryEntry = {
    id: Math.random().toString(36).slice(2),
    createdAt: new Date().toISOString(),
    ...entry,
  };
  store.entries.unshift(full); // most recent first
  // Trim to cap
  if (store.entries.length > MAX_MEMORIES) {
    store.entries = store.entries.slice(0, MAX_MEMORIES);
  }
  writeStore(store);
  return full;
}

/**
 * Retrieve the most relevant past memories for a given concept/query.
 */
export function recallMemory(query: string, limit = MAX_RECALL): BuildMemoryEntry[] {
  const store = readStore();
  if (store.entries.length === 0) return [];

  const queryTokens = keywords(tokenize(query));
  if (queryTokens.length === 0) return store.entries.slice(0, limit);

  const scored = store.entries
    .map((entry) => ({ entry, score: score(queryTokens, entryToText(entry)) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((x) => x.entry);
}

/**
 * Returns a concise memory block to inject into an agent's system prompt.
 * Returns empty string if no relevant memories exist.
 */
export function buildMemoryContext(concept: string): string {
  const memories = recallMemory(concept);
  if (memories.length === 0) return '';

  const lines: string[] = [
    '## Past Build Knowledge (from previous runs)',
    '',
    'The following are lessons learned from similar past builds. Use these to avoid known pitfalls.',
    '',
  ];

  for (const m of memories) {
    lines.push(`### ${m.projectName} (${m.outcome}, ${m.createdAt.slice(0, 10)})`);
    lines.push(`Concept: ${m.concept}`);

    if (m.reviewerFindings.length) {
      lines.push(`Reviewer flagged: ${m.reviewerFindings.join('; ')}`);
    }
    if (m.securityFindings.length) {
      lines.push(`Security issues: ${m.securityFindings.join('; ')}`);
    }
    if (m.problematicPackages.length) {
      lines.push(`Packages that caused problems: ${m.problematicPackages.join(', ')}`);
    }
    if (m.workingPackages.length) {
      lines.push(`Packages that worked well: ${m.workingPackages.join(', ')}`);
    }
    if (m.lessons.length) {
      for (const lesson of m.lessons) {
        lines.push(`- ${lesson}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Get all memory entries (for the run history UI).
 */
export function getAllMemories(): BuildMemoryEntry[] {
  return readStore().entries;
}

/**
 * Delete a memory entry by id.
 */
export function deleteMemory(id: string): boolean {
  const store = readStore();
  const before = store.entries.length;
  store.entries = store.entries.filter((e) => e.id !== id);
  if (store.entries.length < before) {
    writeStore(store);
    return true;
  }
  return false;
}

/**
 * Clear all memories. Used for testing or reset.
 */
export function clearAllMemories() {
  writeStore({ version: 1, entries: [] });
}
