#!/usr/bin/env node
/**
 * Tests for src/lib/build-memory.ts
 *
 * Run: node scripts/test-build-memory.mjs
 */

import assert from 'node:assert/strict';
import { writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

// ── Override the memory file path before importing ───────────────────────────
// We can't easily monkeypatch the module-level constants, so we'll temporarily
// replace the store file, run tests, then restore it.

const REAL_MEMORY_FILE = join(homedir(), '.dev-squad', 'build-memory.json');
const BACKUP_FILE = REAL_MEMORY_FILE + '.test-backup';

// Back up real data if it exists
if (existsSync(REAL_MEMORY_FILE)) {
  const { readFileSync } = await import('node:fs');
  writeFileSync(BACKUP_FILE, readFileSync(REAL_MEMORY_FILE));
}

// Start clean
if (existsSync(REAL_MEMORY_FILE)) rmSync(REAL_MEMORY_FILE);

const {
  saveMemory,
  recallMemory,
  buildMemoryContext,
  getAllMemories,
  deleteMemory,
  clearAllMemories,
} = await import('../src/lib/build-memory.ts');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

// ── Setup helpers ─────────────────────────────────────────────────────────────

function seed() {
  clearAllMemories();
  saveMemory({
    projectName: 'todo-app',
    concept: 'A simple todo list with React and SQLite',
    outcome: 'success',
    reviewerFindings: ['Missing error boundaries in React'],
    securityFindings: [],
    problematicPackages: ['better-sqlite3'],
    workingPackages: ['react', 'vite'],
    lessons: ['better-sqlite3 requires native binding — use sqlite3 npm package instead on ARM'],
    durationMinutes: 12,
  });
  saveMemory({
    projectName: 'ev-station-api',
    concept: 'REST API for electric vehicle charging station locations using PostGIS',
    outcome: 'partial',
    reviewerFindings: ['Rate limiting missing', 'No pagination on location list'],
    securityFindings: ['Raw SQL in search endpoint — use parameterised queries'],
    problematicPackages: ['pg-native'],
    workingPackages: ['pg', 'fastify', 'prisma'],
    lessons: [
      'PostGIS ST_DWithin is fast but needs GiST index on geometry column',
      'pg-native causes build failures on Alpine — use pure JS pg',
    ],
    durationMinutes: 28,
  });
  saveMemory({
    projectName: 'chat-ui',
    concept: 'Real-time chat application with WebSocket and Redis pub/sub',
    outcome: 'success',
    reviewerFindings: [],
    securityFindings: ['Missing CSRF token on REST endpoints'],
    problematicPackages: [],
    workingPackages: ['socket.io', 'redis', 'next'],
    lessons: ['Use socket.io sticky sessions behind nginx load balancer'],
    durationMinutes: 35,
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('\nbuild-memory.ts');

console.log('\n  saveMemory / getAllMemories');

test('starts empty', () => {
  clearAllMemories();
  assert.equal(getAllMemories().length, 0);
});

test('saveMemory returns entry with id and createdAt', () => {
  clearAllMemories();
  const e = saveMemory({
    projectName: 'foo',
    concept: 'test concept',
    outcome: 'success',
    reviewerFindings: [],
    securityFindings: [],
    problematicPackages: [],
    workingPackages: [],
    lessons: [],
  });
  assert.ok(typeof e.id === 'string' && e.id.length > 0, 'id should be set');
  assert.ok(typeof e.createdAt === 'string', 'createdAt should be set');
});

test('getAllMemories returns saved entries', () => {
  clearAllMemories();
  saveMemory({ projectName: 'a', concept: 'aaa', outcome: 'success', reviewerFindings: [], securityFindings: [], problematicPackages: [], workingPackages: [], lessons: [] });
  saveMemory({ projectName: 'b', concept: 'bbb', outcome: 'failed', reviewerFindings: [], securityFindings: [], problematicPackages: [], workingPackages: [], lessons: [] });
  assert.equal(getAllMemories().length, 2);
});

test('most recent entry is first', () => {
  clearAllMemories();
  saveMemory({ projectName: 'first', concept: 'first build', outcome: 'success', reviewerFindings: [], securityFindings: [], problematicPackages: [], workingPackages: [], lessons: [] });
  saveMemory({ projectName: 'second', concept: 'second build', outcome: 'success', reviewerFindings: [], securityFindings: [], problematicPackages: [], workingPackages: [], lessons: [] });
  const all = getAllMemories();
  assert.equal(all[0].projectName, 'second');
  assert.equal(all[1].projectName, 'first');
});

console.log('\n  recallMemory');

test('returns empty array when store is empty', () => {
  clearAllMemories();
  assert.deepEqual(recallMemory('react app'), []);
});

test('recalls relevant entry by concept keyword', () => {
  seed();
  const results = recallMemory('electric vehicle charging station');
  assert.ok(results.length > 0, 'should recall at least one entry');
  assert.equal(results[0].projectName, 'ev-station-api', 'ev entry should rank first');
});

test('recalls react todo entry by react keyword', () => {
  seed();
  const results = recallMemory('todo app with react frontend');
  assert.ok(results.length > 0);
  assert.equal(results[0].projectName, 'todo-app');
});

test('does not return irrelevant entries for unrelated query', () => {
  seed();
  const results = recallMemory('xxxxxxxxxx completely unrelated xxxxxxxxxx');
  assert.equal(results.length, 0, 'unrelated query should return nothing');
});

test('recalls by reviewer finding keyword', () => {
  seed();
  const results = recallMemory('pagination rate limiting');
  const names = results.map((r) => r.projectName);
  assert.ok(names.includes('ev-station-api'), 'ev entry has rate limiting finding');
});

console.log('\n  buildMemoryContext');

test('returns empty string when no matching memories', () => {
  clearAllMemories();
  const ctx = buildMemoryContext('totally unrelated concept xyz');
  assert.equal(ctx, '');
});

test('returns markdown block when memories match', () => {
  seed();
  const ctx = buildMemoryContext('REST API with PostGIS electric vehicle');
  assert.ok(ctx.includes('Past Build Knowledge'), 'should include heading');
  assert.ok(ctx.includes('ev-station-api'), 'should include matching project');
});

test('includes reviewer findings in context', () => {
  seed();
  const ctx = buildMemoryContext('rate limiting pagination API');
  assert.ok(ctx.includes('Rate limiting missing'), 'should include reviewer finding');
});

console.log('\n  deleteMemory');

test('deleteMemory removes entry by id', () => {
  clearAllMemories();
  const e = saveMemory({ projectName: 'del-test', concept: 'delete me', outcome: 'success', reviewerFindings: [], securityFindings: [], problematicPackages: [], workingPackages: [], lessons: [] });
  assert.equal(getAllMemories().length, 1);
  const ok = deleteMemory(e.id);
  assert.ok(ok, 'should return true');
  assert.equal(getAllMemories().length, 0);
});

test('deleteMemory returns false for unknown id', () => {
  clearAllMemories();
  const ok = deleteMemory('nonexistent-id-xyz');
  assert.ok(!ok);
});

console.log('\n  clearAllMemories');

test('clearAllMemories empties the store', () => {
  seed();
  assert.ok(getAllMemories().length > 0, 'precondition: store not empty');
  clearAllMemories();
  assert.equal(getAllMemories().length, 0);
});

// ── Restore real data ─────────────────────────────────────────────────────────

clearAllMemories();
if (existsSync(BACKUP_FILE)) {
  const { readFileSync } = await import('node:fs');
  writeFileSync(REAL_MEMORY_FILE, readFileSync(BACKUP_FILE));
  rmSync(BACKUP_FILE);
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
