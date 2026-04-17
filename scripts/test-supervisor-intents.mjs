import assert from 'node:assert/strict';

import { parseSupervisorIntent } from '../src/lib/supervisor-intents.ts';

// ── start-run ──────────────────────────────────────────────────────────────
assert.deepEqual(parseSupervisorIntent('start planning'), {
  action: 'start-run',
  runGoal: 'plan-only',
});

assert.deepEqual(parseSupervisorIntent('Kick off the planner for a snake game'), {
  action: 'start-run',
  runGoal: 'plan-only',
  concept: 'a snake game',
});

assert.deepEqual(parseSupervisorIntent('start strict full build for a todo app'), {
  action: 'start-run',
  runGoal: 'full-build',
  securityMode: 'strict',
  concept: 'a todo app',
});

// freeform "build me a X"
assert.deepEqual(parseSupervisorIntent('build me a REST API for managing tasks'), {
  action: 'start-run',
  runGoal: 'full-build',
  concept: 'a rest api for managing tasks',
});

assert.deepEqual(parseSupervisorIntent('create a weather dashboard app'), {
  action: 'start-run',
  runGoal: 'full-build',
  concept: 'a weather dashboard app',
});

// ── set-stop-after-review ─────────────────────────────────────────────────
assert.deepEqual(parseSupervisorIntent('stop after review'), {
  action: 'set-stop-after-review',
  enabled: true,
});

assert.deepEqual(parseSupervisorIntent('pause after review'), {
  action: 'set-stop-after-review',
  enabled: true,
});

assert.deepEqual(parseSupervisorIntent('hold after review'), {
  action: 'set-stop-after-review',
  enabled: true,
});

assert.deepEqual(parseSupervisorIntent('keep running after review'), {
  action: 'set-stop-after-review',
  enabled: false,
});

assert.deepEqual(parseSupervisorIntent("don't stop after review"), {
  action: 'set-stop-after-review',
  enabled: false,
});

// ── resume-run ────────────────────────────────────────────────────────────
assert.deepEqual(parseSupervisorIntent('continue build'), {
  action: 'resume-run',
});

assert.deepEqual(parseSupervisorIntent('resume the stalled planner'), {
  action: 'resume-run',
});

assert.deepEqual(parseSupervisorIntent('go ahead'), {
  action: 'resume-run',
});

assert.deepEqual(parseSupervisorIntent('proceed'), {
  action: 'resume-run',
});

assert.deepEqual(parseSupervisorIntent('looks good continue'), {
  action: 'resume-run',
});

// ── stop-run ──────────────────────────────────────────────────────────────
assert.deepEqual(parseSupervisorIntent('stop'), {
  action: 'stop-run',
});

assert.deepEqual(parseSupervisorIntent('abort build'), {
  action: 'stop-run',
});

assert.deepEqual(parseSupervisorIntent('cancel build'), {
  action: 'stop-run',
});

// ── null (not a command) ──────────────────────────────────────────────────
assert.equal(parseSupervisorIntent('What should we do next?'), null);
assert.equal(parseSupervisorIntent('I want to build a snake game'), null);
assert.equal(parseSupervisorIntent('How is the plan looking?'), null);

console.log('supervisor intent checks passed');
