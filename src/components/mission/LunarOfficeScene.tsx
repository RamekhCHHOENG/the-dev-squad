'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useLayoutEffect, useRef, useState, useEffect } from 'react';
import { PixelSprite } from './PixelSprite';
import type { AgentId } from '@/lib/use-pipeline';


type WorkerId = 'planner' | 'reviewer' | 'coder' | 'tester' | 'supervisor' | 'security' | 'devops';

interface WorkerDef {
  id: WorkerId;
  agentId: AgentId;
  name: string;
  title: string;
  color: string;
  x: number;
  y: number;
}

const SCENE_W = 1200;
const SCENE_H = 560;

interface WorkerPos {
  x: number;
  y: number;
  facing: 'left' | 'right' | 'back';
}

const AGENT_TO_WORKER: Partial<Record<AgentId, WorkerId>> = {
  A: 'planner', B: 'reviewer', C: 'coder', D: 'tester', S: 'supervisor', E: 'security', F: 'devops',
};

const workers: WorkerDef[] = [
  { id: 'planner',    agentId: 'A', name: 'Alexis',  title: 'Planner',    color: '#7c3aed', x: 155,  y: 370 },
  { id: 'reviewer',   agentId: 'B', name: 'Brad',    title: 'Reviewer',   color: '#3b82f6', x: 365,  y: 370 },
  { id: 'coder',      agentId: 'C', name: 'Carlos',  title: 'Coder',      color: '#eab308', x: 558,  y: 370 },
  { id: 'tester',     agentId: 'D', name: 'Dana',    title: 'Tester',     color: '#ef4444', x: 775,  y: 370 },
  { id: 'supervisor', agentId: 'S', name: 'Sal',     title: 'Supervisor', color: '#10b981', x: 990,  y: 370 },
  { id: 'security',   agentId: 'E', name: 'Eva',     title: 'Security',   color: '#f97316', x: 1110, y: 450 },
  { id: 'devops',     agentId: 'F', name: 'Finn',    title: 'DevOps',     color: '#06b6d4', x: 90,   y: 450 },
];

// Home positions — each worker always faces the same direction
// Workers sit BELOW their desks — feet at y:460, heads peek above desk edge
const homePositions: Record<WorkerId, WorkerPos> = {
  planner:    { x: 184,  y: 345, facing: 'back' },
  reviewer:   { x: 394,  y: 345, facing: 'back' },
  coder:      { x: 595,  y: 345, facing: 'back' },
  tester:     { x: 805,  y: 345, facing: 'back' },
  supervisor: { x: 1015, y: 345, facing: 'back' },
  security:   { x: 1110, y: 430, facing: 'left'  },
  devops:     { x: 90,   y: 430, facing: 'right' },
};

// Per-phase position overrides for ACTIVE workers (pipeline movements)
// Matches actual orchestrator flow: A plans, A↔B review, C codes, C↔D review+test, A deploys
// S (Supervisor) is never spawned by orchestrator — no overrides for S
const phasePositions: Record<string, Partial<Record<WorkerId, WorkerPos>>> = {
  concept: {
    planner: { x: 184, y: 345, facing: 'back' },
  },
  planning: {
    planner: { x: 184, y: 345, facing: 'back' },
  },
  'plan-review': {
    planner:  { x: 370, y: 345, facing: 'right' },  // A walks to B's desk with the plan
    reviewer: { x: 394, y: 345, facing: 'left' },    // B turns to face A
  },
  coding: {
    coder: { x: 595, y: 345, facing: 'back' },
  },
  'code-review': {
    coder:  { x: 780, y: 345, facing: 'right' },   // C walks to D's desk with the code
    tester: { x: 805, y: 345, facing: 'left' },     // D turns to face C
  },
  testing: {
    coder:  { x: 780, y: 345, facing: 'right' },   // C stays near D while D tests
    tester: { x: 805, y: 345, facing: 'back' },     // D turns to test
  },
  deploy: {
    planner: { x: 184, y: 345, facing: 'back' },    // A at desk ready to deploy
    tester:  { x: 210, y: 345, facing: 'left' },     // D walks to A's desk with final code
  },
  'security-audit': {
    security: { x: 640, y: 345, facing: 'right' },   // E moves to C's desk area to audit
    coder:    { x: 595, y: 345, facing: 'back' },     // C stays at desk while E audits
  },
  devops: {
    devops: { x: 90, y: 430, facing: 'right' },      // F works at their station
  },
  complete: {},
};

// Idle activity spots — places workers can wander to when not active
const idleSpots: { x: number; y: number; label: string }[] = [
  { x: 45,   y: 330, label: 'water-cooler-left' },
  { x: 1060, y: 330, label: 'water-cooler-right' },
  { x: 250,  y: 380, label: 'plant-1' },
  { x: 480,  y: 380, label: 'plant-2' },
  { x: 700,  y: 380, label: 'plant-3' },
  { x: 870,  y: 380, label: 'plant-4' },
  { x: 45,   y: 390, label: 'filing-left' },
  { x: 1060, y: 390, label: 'filing-right' },
  { x: 450,  y: 330, label: 'hallway-1' },
  { x: 660,  y: 330, label: 'hallway-2' },
  { x: 200,  y: 430, label: 'floor-left' },
  { x: 140,  y: 460, label: 'pingpong' },
  { x: 280,  y: 460, label: 'pingpong' },
  { x: 859,  y: 470, label: 'hookah' },
  { x: 975,  y: 470, label: 'hookah' },
  { x: 917,  y: 515, label: 'hookah' },
  { x: 600,  y: 440, label: 'floor-center' },
  { x: 800,  y: 450, label: 'floor-center-right' },
  { x: 150,  y: 480, label: 'floor-far-left' },
  { x: 550,  y: 490, label: 'floor-far-center' },
  { x: 850,  y: 480, label: 'floor-far-right' },
  { x: 1080, y: 485, label: 'couch' },
  { x: 1120, y: 485, label: 'couch' },
];

const phaseCarriers: Record<string, WorkerId | null> = {
  concept: null,
  planning: null,
  'plan-review': 'planner',     // A carries plan to B's desk
  coding: null,
  'code-review': 'coder',       // C carries code to D's desk
  testing: null,
  deploy: 'tester',             // D carries final tested code to A's desk
  'security-audit': null,
  devops: null,
  complete: null,
};

const phaseLabels: Record<string, string> = {
  concept: 'Defining the concept',
  planning: 'Drafting the plan',
  'plan-review': 'Reviewing the plan',
  coding: 'Writing code',
  'code-review': 'Reviewing code changes',
  'security-audit': 'Security auditing',
  testing: 'Running tests',
  devops: 'Scaffolding infrastructure',
  deploy: 'Deploying the build',
  complete: 'Build complete',
};

// Per-agent speech — describes what each agent is doing when active in a phase
const agentSpeechPool: Record<AgentId, Record<string, string[]>> = {
  A: {
    concept: [
      'Reading the brief...',
      'Parsing the concept.',
      'Scoping this out.',
      'Interesting. Let me think.',
    ],
    planning: [
      'Writing the plan...',
      'Researching dependencies.',
      'Structuring the architecture.',
      'Checking package versions.',
      'Drafting file layout.',
    ],
    'plan-review': [
      'Answering reviewer questions.',
      'Updating the plan.',
      'Verifying my assumptions.',
      'Adding more detail here.',
    ],
    deploy: [
      'Committing to git...',
      'Deploying the build.',
      'Final checks...',
      'Pushing to remote.',
    ],
    complete: [
      'Build shipped.',
      'Done. Next project?',
    ],
  },
  B: {
    'plan-review': [
      'Reading the full plan...',
      'Checking for gaps.',
      'This section is vague.',
      'Verifying edge cases.',
      'Cross-referencing requirements.',
      'Sending questions to Planner.',
      'Reviewing updated plan.',
      'Almost satisfied.',
    ],
    complete: [
      'My work here is done.',
    ],
  },
  C: {
    coding: [
      'Writing code...',
      'Building the components.',
      'Implementing the plan.',
      'One more file to write.',
      'Following the spec exactly.',
    ],
    'code-review': [
      'Fixing review issues.',
      'Updating the code.',
      'Addressing feedback.',
    ],
    testing: [
      'Fixing test failures.',
      'Patching the bug.',
      'Applying the fix.',
    ],
    complete: [
      'Code is done.',
    ],
  },
  D: {
    'code-review': [
      'Reading the diff...',
      'Comparing to the plan.',
      'Found a mismatch.',
      'Checking every file.',
      'Sending issues to Coder.',
      'Re-reviewing the fixes.',
    ],
    testing: [
      'Running tests...',
      'Launching the app.',
      'Testing edge cases.',
      'Checking all functionality.',
      'One test failing...',
      'Re-running after fix.',
    ],
    deploy: [
      'Handing off to Planner.',
    ],
    complete: [
      'All tests passed.',
    ],
  },
  E: {
    'security-audit': [
      'Checking for injection...',
      'OWASP Top 10 review.',
      'Scanning for secrets.',
      'Verifying auth flows.',
      'No hardcoded tokens?',
      'Input validation pass.',
    ],
    complete: ['All clean. Ship it.'],
  },
  F: {
    devops: [
      'Writing Dockerfile...',
      'Building docker-compose.',
      'Configuring CI...',
      'Health checks added.',
      'Setting up .env.example.',
    ],
    complete: ['Infra scaffolded.'],
  },
  S: {
    concept: [
      'Standing by.',
    ],
    complete: [
      'Good work, team.',
    ],
  },
};

function getRandomSpeech(agentId: AgentId, phase: string): string {
  const agentPool = agentSpeechPool[agentId];
  const pool = agentPool?.[phase] || agentPool?.['concept'] || ['Working...'];
  return pool[Math.floor(Math.random() * pool.length)];
}

interface DeskPos { x: number; y: number; w: number; h: number }
interface DeskSetup {
  desk: DeskPos;
  chair: DeskPos;
  monitor: DeskPos;
  extra: DeskPos;
}

const DESK_W = 250;
const DESK_H = 170;
const CHAIR_Y = 280;
const desks: DeskSetup[] = [
  {
    desk:    { x: 55,  y: 195, w: DESK_W, h: DESK_H },
    chair:   { x: 159, y: CHAIR_Y, w: 55,  h: 60  },
    monitor: { x: 117, y: 218, w: 48,  h: 48  },
    extra:   { x: 185, y: 238, w: 40,  h: 40  },
  },
  {
    desk:    { x: 260, y: 195, w: DESK_W, h: DESK_H },
    chair:   { x: 364, y: CHAIR_Y, w: 55,  h: 60  },
    monitor: { x: 323, y: 222, w: 48,  h: 48  },
    extra:   { x: 400, y: 240, w: 40,  h: 40  },
  },
  {
    desk:    { x: 465, y: 195, w: DESK_W, h: DESK_H },
    chair:   { x: 569, y: CHAIR_Y, w: 55,  h: 60  },
    monitor: { x: 523, y: 218, w: 48,  h: 48  },
    extra:   { x: 590, y: 238, w: 40,  h: 40  },
  },
  {
    desk:    { x: 670, y: 195, w: DESK_W, h: DESK_H },
    chair:   { x: 774, y: CHAIR_Y, w: 55,  h: 60  },
    monitor: { x: 733, y: 222, w: 48,  h: 48  },
    extra:   { x: 810, y: 240, w: 40,  h: 40  },
  },
  {
    desk:    { x: 875, y: 195, w: DESK_W, h: DESK_H },
    chair:   { x: 979, y: CHAIR_Y, w: 55,  h: 60  },
    monitor: { x: 910, y: 218, w: 48,  h: 48  },
    extra:   { x: 980, y: 238, w: 40,  h: 40  },
  },
];

// CSS furniture components
function CSSDesk({ x, y, w, h }: DeskPos) {
  return (
    <div className="absolute" style={{ left: x, top: y, width: w, height: h, zIndex: 5 }}>
      <div className="absolute inset-x-[5%] top-0 h-[35%] rounded-t-[4px] border border-black/20 bg-[#5c4a3a] shadow-[inset_0_2px_0_rgba(255,255,255,0.1)]" />
      <div className="absolute bottom-[10%] left-[8%] h-[55%] w-[3px] bg-[#4a3a2e]" />
      <div className="absolute bottom-[10%] right-[8%] h-[55%] w-[3px] bg-[#4a3a2e]" />
      <div className="absolute inset-x-[5%] top-[8%] h-[4px] bg-[#6b5a48]" />
    </div>
  );
}

function CSSChair({ x, y, w, h }: DeskPos) {
  return (
    <div className="absolute" style={{ left: x, top: y, width: w, height: h, zIndex: 4 }}>
      <div className="absolute left-[15%] top-0 h-[40%] w-[70%] rounded-t-[6px] border border-black/15 bg-[#2a2a3a]" />
      <div className="absolute left-[20%] top-[38%] h-[25%] w-[60%] rounded-[3px] bg-[#333345]" />
      <div className="absolute bottom-[5%] left-[25%] h-[30%] w-[4px] bg-[#1a1a28]" />
      <div className="absolute bottom-[5%] right-[25%] h-[30%] w-[4px] bg-[#1a1a28]" />
    </div>
  );
}

function CSSMonitor({ x, y, w, h }: DeskPos) {
  return (
    <div className="absolute" style={{ left: x, top: y, width: w, height: h, zIndex: 6 }}>
      <div className="absolute inset-[8%] rounded-[3px] border border-black/30 bg-[#1a1a2e]">
        <motion.div
          className="absolute inset-[12%] rounded-[2px] bg-[#0a2a1a]"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <div className="absolute left-[10%] top-[15%] h-[8%] w-[60%] rounded-full bg-[#33ff66]/40" />
          <div className="absolute left-[10%] top-[30%] h-[8%] w-[80%] rounded-full bg-[#33ff66]/30" />
          <div className="absolute left-[10%] top-[45%] h-[8%] w-[45%] rounded-full bg-[#33ff66]/35" />
          <div className="absolute left-[10%] top-[60%] h-[8%] w-[70%] rounded-full bg-[#33ff66]/25" />
          <div className="absolute left-[10%] top-[75%] h-[8%] w-[55%] rounded-full bg-[#33ff66]/30" />
        </motion.div>
      </div>
      <div className="absolute bottom-0 left-1/2 h-[12%] w-[15%] -translate-x-1/2 bg-[#333]" />
    </div>
  );
}

function CSSMug({ x, y, w, h }: DeskPos) {
  return (
    <div className="absolute" style={{ left: x, top: y, width: w, height: h, zIndex: 7 }}>
      <div className="absolute bottom-[20%] left-[25%] h-[55%] w-[45%] rounded-b-[4px] border border-black/20 bg-[#e8e0d0]">
        <div className="absolute right-[-30%] top-[15%] h-[50%] w-[30%] rounded-r-full border-2 border-l-0 border-black/15" />
      </div>
      <motion.div
        className="absolute left-[30%] top-[5%] h-[20%] w-[8%] rounded-full bg-white/20"
        animate={{ y: [0, -4, -8], opacity: [0.3, 0.15, 0] }}
        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
      />
    </div>
  );
}

function CSSPlant({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <div className="absolute" style={{ left: x, top: y, width: w, height: h, zIndex: 7 }}>
      <div className="absolute bottom-0 left-1/2 h-[35%] w-[50%] -translate-x-1/2 rounded-b-[4px] rounded-t-[2px] border border-black/15 bg-[#8b6b4a]" />
      <div className="absolute bottom-[30%] left-1/2 h-[45%] w-[70%] -translate-x-1/2 rounded-full bg-[#2d6b3f]" />
      <div className="absolute bottom-[45%] left-[20%] h-[35%] w-[40%] rounded-full bg-[#3a8a50]" />
      <div className="absolute bottom-[50%] right-[15%] h-[30%] w-[35%] rounded-full bg-[#257a3a]" />
    </div>
  );
}

function CSSChart({ x, y, w, h, type }: { x: number; y: number; w: number; h: number; type: 'line' | 'bar' }) {
  return (
    <div className="absolute rounded-[2px] border border-black/20 bg-white/10" style={{ left: x, top: y, width: w, height: h, zIndex: 4 }}>
      {type === 'line' ? (
        <svg className="absolute inset-[15%]" viewBox="0 0 40 20" fill="none">
          <polyline points="0,18 8,12 16,15 24,6 32,9 40,3" stroke="#33ff66" strokeWidth="1.5" opacity="0.6" />
          <polyline points="0,16 8,14 16,10 24,12 32,5 40,8" stroke="#6699ff" strokeWidth="1" opacity="0.4" />
        </svg>
      ) : (
        <div className="absolute inset-[15%] flex items-end gap-[8%]">
          <div className="h-[60%] flex-1 bg-[#33ff66]/40" />
          <div className="h-[80%] flex-1 bg-[#33ff66]/50" />
          <div className="h-[45%] flex-1 bg-[#33ff66]/35" />
          <div className="h-[90%] flex-1 bg-[#33ff66]/55" />
          <div className="h-[70%] flex-1 bg-[#33ff66]/45" />
        </div>
      )}
    </div>
  );
}

function CSSWhiteboard({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <div className="absolute rounded-[2px] border-2 border-[#999] bg-[#f0ece4]" style={{ left: x, top: y, width: w, height: h, zIndex: 4 }}>
      <div className="absolute left-[10%] top-[20%] h-[6%] w-[60%] rounded-full bg-[#e74c3c]/50" />
      <div className="absolute left-[10%] top-[35%] h-[6%] w-[80%] rounded-full bg-[#3498db]/40" />
      <div className="absolute left-[10%] top-[50%] h-[6%] w-[45%] rounded-full bg-[#2ecc71]/40" />
      <div className="absolute left-[10%] top-[65%] h-[6%] w-[70%] rounded-full bg-[#333]/20" />
    </div>
  );
}

function CSSWaterCooler({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <div className="absolute" style={{ left: x, top: y, width: w, height: h, zIndex: 5 }}>
      <div className="absolute left-1/2 top-0 h-[30%] w-[40%] -translate-x-1/2 rounded-t-full border border-black/15 bg-[#a8d8ea]/60" />
      <div className="absolute left-1/2 top-[28%] h-[55%] w-[55%] -translate-x-1/2 rounded-[3px] border border-black/15 bg-[#ddd]" />
      <div className="absolute bottom-0 left-1/2 h-[15%] w-[65%] -translate-x-1/2 rounded-b-[3px] bg-[#999]" />
    </div>
  );
}

function CSSCalendar({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <div className="absolute rounded-[2px] border border-black/20 bg-white/90" style={{ left: x, top: y, width: w, height: h, zIndex: 4 }}>
      <div className="absolute inset-x-0 top-0 h-[20%] rounded-t-[2px] bg-[#e74c3c]" />
      <div className="absolute inset-[15%] top-[25%] grid grid-cols-5 gap-[4%]">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-[1px] bg-black/10" />
        ))}
      </div>
    </div>
  );
}

function CSSNameplate({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <div className="absolute flex items-center justify-center rounded-[2px] border border-[#8b7355] bg-[#2a2218]" style={{ left: x, top: y, width: w, height: h, zIndex: 7 }}>
      <span className="text-[7px] font-bold tracking-wider text-[#d4a847]">BOSS</span>
    </div>
  );
}

function CSSCouchFront({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <div className="absolute" style={{ left: x, top: y, width: w, height: h, zIndex: 6 }}>
      <div className="absolute inset-0 rounded-[6px] border border-black/20 bg-[#4a3a5c]" />
      <div className="absolute left-[3%] top-[15%] h-[70%] w-[20%] rounded-[4px] bg-[#5a4a6e]" />
      <div className="absolute right-[3%] top-[15%] h-[70%] w-[20%] rounded-[4px] bg-[#5a4a6e]" />
    </div>
  );
}

function CSSCushion({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <div className="absolute rounded-[4px] border border-black/10 bg-[#6b5a7e] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
      style={{ left: x, top: y, width: w, height: h, zIndex: 6 }} />
  );
}

function CSSRetroTV({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <div className="absolute" style={{ left: x, top: y, width: w, height: h, zIndex: 6 }}>
      <div className="absolute inset-0 rounded-[6px] border-2 border-black/30 bg-[#8b7355]">
        <div className="absolute inset-[10%] rounded-[3px] border border-black/20 bg-[#1a1a2e]">
          <motion.div
            className="absolute inset-[8%] rounded-[2px] bg-[#0a1a2a]"
            animate={{ opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px]" />
          </motion.div>
        </div>
        <div className="absolute bottom-[8%] right-[8%] h-[8%] w-[8%] rounded-full bg-[#33ff66]/60" />
      </div>
      <div className="absolute left-[30%] top-[-15%] h-[20%] w-[4%] origin-bottom rotate-[-20deg] bg-[#555]" />
      <div className="absolute right-[30%] top-[-15%] h-[20%] w-[4%] origin-bottom rotate-[20deg] bg-[#555]" />
    </div>
  );
}

const stars = [
  { left: 60, top: 38, size: 3 },
  { left: 180, top: 55, size: 4 },
  { left: 350, top: 35, size: 3 },
  { left: 500, top: 42, size: 3 },
  { left: 650, top: 50, size: 4 },
  { left: 820, top: 38, size: 3 },
  { left: 950, top: 48, size: 3 },
  { left: 1100, top: 40, size: 4 },
];

function Sprite({ src, x, y, w, h, z = 5 }: { src: string; x: number; y: number; w: number; h: number; z?: number }) {
  return (
    <img
      src={src}
      alt=""
      className="absolute"
      style={{ left: x, top: y, width: w, height: h, imageRendering: 'pixelated', objectFit: 'contain', zIndex: z }}
    />
  );
}

function WaterPipe({ x, y }: { x: number; y: number }) {
  return (
    <div className="absolute z-[12]" style={{ left: x, top: y }}>
      {/* Base — round bottom chamber with "water" */}
      <div className="relative h-[18px] w-[14px] rounded-b-full rounded-t-[3px] border border-black/20 bg-[#8ec8e8]/60">
        {/* Water level */}
        <div className="absolute bottom-0 left-0 right-0 h-[55%] rounded-b-full bg-[#5ba8d4]/50" />
        {/* Glass highlight */}
        <div className="absolute left-[15%] top-[10%] h-[60%] w-[20%] rounded-full bg-white/25" />
      </div>
      {/* Neck — tall tube */}
      <div className="absolute bottom-[16px] left-1/2 h-[16px] w-[5px] -translate-x-1/2 rounded-t-full border border-black/15 bg-[#8ec8e8]/50">
        <div className="absolute left-[20%] top-[10%] h-[70%] w-[25%] bg-white/20" />
      </div>
      {/* Mouthpiece — slight flare at top */}
      <div className="absolute bottom-[30px] left-1/2 h-[4px] w-[7px] -translate-x-1/2 rounded-t-full border border-black/15 bg-[#8ec8e8]/45" />
      {/* Bowl — angled piece sticking out right */}
      <div className="absolute bottom-[12px] left-[11px] h-[4px] w-[8px] origin-left rotate-[-35deg] rounded-r-full border border-black/15 bg-[#7a7a7a]">
        {/* Bowl head */}
        <div className="absolute -top-[3px] right-[-2px] h-[5px] w-[5px] rounded-full border border-black/20 bg-[#6a6a6a]" />
      </div>
      {/* Tiny bubbles animation */}
      <motion.div
        className="absolute bottom-[4px] left-1/2 h-[2px] w-[2px] -translate-x-1/2 rounded-full bg-white/40"
        animate={{ y: [0, -6, -10], opacity: [0.5, 0.3, 0], x: [-1, 1, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut', repeatDelay: 4 }}
      />
      <motion.div
        className="absolute bottom-[3px] left-[40%] h-[1.5px] w-[1.5px] rounded-full bg-white/30"
        animate={{ y: [0, -5, -8], opacity: [0.4, 0.2, 0], x: [1, -1, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 1.2, repeatDelay: 4 }}
      />
    </div>
  );
}


function Worker({ worker, isActive, speech }: { worker: WorkerDef; isActive: boolean; speech?: string }) {
  return (
    <div className="absolute z-20" style={{ left: worker.x, top: worker.y, transform: 'translate(-50%, -50%)' }}>
      <motion.div
        className="relative"
        animate={isActive ? { scale: [1, 1.1, 1] } : {}}
        transition={isActive ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } : {}}
      >
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 rounded-full bg-black/30" style={{ width: 30, height: 14, marginTop: 12 }} />
        <div
          className="relative rounded-full border-2 border-white/25"
          style={{
            width: 26, height: 26,
            background: `radial-gradient(circle at 35% 35%, ${worker.color}dd, ${worker.color})`,
            boxShadow: isActive ? `0 0 14px ${worker.color}66` : 'none',
          }}
        >
          <div className="absolute left-1/2 top-[28%] h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-white/80" />
          <div className="absolute left-[28%] top-[26%] h-1.5 w-1.5 rounded-full bg-white/50" />
          <div className="absolute right-[28%] top-[26%] h-1.5 w-1.5 rounded-full bg-white/50" />
          {isActive && (
            <motion.div
              className="absolute -inset-3 rounded-full border-2"
              style={{ borderColor: `${worker.color}55` }}
              animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/75 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white" style={{ top: 34 }}>
          {worker.name}
        </div>
      </motion.div>

      <AnimatePresence>
        {speech && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="absolute left-1/2 -translate-x-1/2 rounded-lg border border-white/15 bg-black/85 px-3 py-2 text-[10px] leading-tight text-white backdrop-blur-sm"
            style={{ bottom: 52, width: 150 }}
          >
            {speech}
            <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-black/85" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function LunarOfficeScene({
  activePhase,
  agentStatus,
  latestSpeech,
  onAgentClick,
}: {
  activePhase: string;
  agentStatus: Record<AgentId, string>;
  latestSpeech: Record<AgentId, string | null>;
  onAgentClick?: (agent: AgentId) => void;
}) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = sceneRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) setScale(e.contentRect.width / SCENE_W);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const [walkingIds, setWalkingIds] = useState<Set<string>>(new Set());
  const [idlePositions, setIdlePositions] = useState<Record<WorkerId, WorkerPos | null>>({
    planner: null, reviewer: null, coder: null, tester: null, supervisor: null, security: null, devops: null,
  });
  const idlePositionsRef = useRef(idlePositions);
  idlePositionsRef.current = idlePositions;
  const prevPhaseRef = useRef(activePhase);
  const idleTimerRef = useRef<number[]>([]);

  // When phase changes, only move pipeline workers immediately
  useLayoutEffect(() => {
    if (prevPhaseRef.current === activePhase) return;
    prevPhaseRef.current = activePhase;

    // Clear any pending idle timers
    idleTimerRef.current.forEach(t => window.clearTimeout(t));
    idleTimerRef.current = [];

    // Reset all idle positions — everyone returns home first
    setIdlePositions({ planner: null, reviewer: null, coder: null, tester: null, supervisor: null, security: null, devops: null });

    // Mark only pipeline movers as walking
    const overrides = phasePositions[activePhase] || {};
    const pipelineMovers = new Set<string>();
    for (const [wId, pos] of Object.entries(overrides)) {
      const home = homePositions[wId as WorkerId];
      if (pos.x !== home.x || pos.y !== home.y) pipelineMovers.add(wId);
    }
    setWalkingIds(pipelineMovers);

    // Stop pipeline walking after arrival
    const stopPipeline = window.setTimeout(() => {
      setWalkingIds(new Set());
    }, 2600);
    idleTimerRef.current.push(stopPipeline);

    // Stagger idle movements — one worker at a time, random delays
    const activeIds = new Set<WorkerId>(Object.keys(overrides) as WorkerId[]);
    const idleWorkers = (['planner', 'reviewer', 'coder', 'tester', 'supervisor', 'security', 'devops'] as WorkerId[])
      .filter(id => !activeIds.has(id));

    // Shuffle idle workers
    const shuffled = [...idleWorkers].sort(() => Math.random() - 0.5);

    // Pick spots without overlap
    const usedSpotIdxs = new Set<number>();

    shuffled.forEach((wId, i) => {
      // 50% chance to wander, 50% stay at desk
      if (Math.random() < 0.5) return;

      // Stagger: first idle worker moves at 2s, next at 4.5s, etc.
      const delay = 2000 + i * 2500;

      const timer = window.setTimeout(() => {
        // Find an available spot
        const startIdx = Math.floor(Math.random() * idleSpots.length);
        for (let attempt = 0; attempt < idleSpots.length; attempt++) {
          const idx = (startIdx + attempt) % idleSpots.length;
          if (usedSpotIdxs.has(idx)) continue;

          const spot = idleSpots[idx];
          let tooClose = false;
          for (const usedIdx of usedSpotIdxs) {
            const other = idleSpots[usedIdx];
            // Couch seats can be adjacent — skip overlap check between couch spots
            const bothGroupSpot = spot.label === other.label && (spot.label === 'couch' || spot.label === 'hookah' || spot.label === 'pingpong');
            if (!bothGroupSpot && Math.abs(spot.x - other.x) < 80 && Math.abs(spot.y - other.y) < 60) {
              tooClose = true;
              break;
            }
          }
          if (!tooClose) {
            usedSpotIdxs.add(idx);
            const isCouch = spot.label === 'couch';
            const isHookah = spot.label === 'hookah';
            const isPingPong = spot.label === 'pingpong';
            const isGroupSpot = isCouch || isHookah || isPingPong;
            const home = homePositions[wId];
            const spotFacing = isCouch
              ? 'back' as const
              : isHookah
              ? 'front' as const
              : isPingPong
              ? (spot.x < 210 ? 'right' as const : 'left' as const)
              : spot.x < home.x ? 'left' as const : 'right' as const;

            // Walk facing the direction of movement, switch to spot facing on arrival
            const walkFacing = spot.x < home.x ? 'left' as const : 'right' as const;
            setWalkingIds(prev => new Set([...prev, wId]));
            setIdlePositions(prev => ({ ...prev, [wId]: { x: spot.x, y: spot.y, facing: walkFacing } }));

            // Stop walking and switch to destination facing on arrival
            const stopTimer = window.setTimeout(() => {
              setWalkingIds(prev => {
                const next = new Set(prev);
                next.delete(wId);
                return next;
              });
              setIdlePositions(prev => prev[wId] ? ({ ...prev, [wId]: { ...prev[wId]!, facing: spotFacing } }) : prev);
            }, 2600);
            idleTimerRef.current.push(stopTimer);

            // Return home after a while — group spots: 30-60s, other spots: 3-5s
            const stayDuration = isGroupSpot
              ? 30000 + Math.random() * 30000
              : 3000 + Math.random() * 2000;
            const returnTimer = window.setTimeout(() => {
              const home = homePositions[wId];
              const returnWalkFacing = home.x < spot.x ? 'left' as const : 'right' as const;
              setWalkingIds(prev => new Set([...prev, wId]));
              setIdlePositions(prev => ({ ...prev, [wId]: { x: home.x, y: home.y, facing: returnWalkFacing } }));

              const returnStopTimer = window.setTimeout(() => {
                setWalkingIds(prev => {
                  const next = new Set(prev);
                  next.delete(wId);
                  return next;
                });
                setIdlePositions(prev => ({ ...prev, [wId]: null })); // null = back to homePositions facing
              }, 2600);
              idleTimerRef.current.push(returnStopTimer);
            }, stayDuration);
            idleTimerRef.current.push(returnTimer);

            break;
          }
        }
      }, delay);
      idleTimerRef.current.push(timer);
    });

    return () => {
      window.clearTimeout(stopPipeline);
    };
  }, [activePhase]);

  // Periodic idle wandering — independent of phase changes
  // Every 15-25s, pick a random non-active agent and send them somewhere
  // Occasionally triggers group gatherings at hookah or couch
  const idleWanderRef = useRef<number[]>([]);
  useEffect(() => {
    // Send a group of agents to a group spot (hookah or couch)
    function sendGroup(groupLabel: 'hookah' | 'couch', agents: WorkerId[]) {
      const spots = idleSpots.filter(s => s.label === groupLabel);
      const facing = groupLabel === 'couch' ? 'back' as const : 'front' as const;

      agents.forEach((wId, i) => {
        if (i >= spots.length) return;
        const spot = spots[i];
        const currentPos = idlePositions[wId] || homePositions[wId];

        // Stagger departures slightly
        const departTimer = window.setTimeout(() => {
          const currentPos = idlePositions[wId] || homePositions[wId];
          const groupWalkFacing = spot.x < currentPos.x ? 'left' as const : 'right' as const;
          setWalkingIds(p => new Set([...p, wId]));
          setIdlePositions(prev => ({ ...prev, [wId]: { x: spot.x, y: spot.y, facing: groupWalkFacing } }));
          const stopTimer = window.setTimeout(() => {
            setWalkingIds(p => { const n = new Set(p); n.delete(wId); return n; });
            setIdlePositions(prev => prev[wId] ? ({ ...prev, [wId]: { ...prev[wId]!, facing } }) : prev);
          }, 2600);
          idleWanderRef.current.push(stopTimer);

          // Return home after 30-60s
          const returnTimer = window.setTimeout(() => {
            const home = homePositions[wId];
            const returnFacing = home.x < spot.x ? 'left' as const : 'right' as const;
            setWalkingIds(p => new Set([...p, wId]));
            setIdlePositions(p => ({ ...p, [wId]: { x: home.x, y: home.y, facing: returnFacing } }));
            const returnStop = window.setTimeout(() => {
              setWalkingIds(p => { const n = new Set(p); n.delete(wId); return n; });
              setIdlePositions(p => ({ ...p, [wId]: null }));
            }, 2600);
            idleWanderRef.current.push(returnStop);
          }, 30000 + Math.random() * 30000);
          idleWanderRef.current.push(returnTimer);
        }, i * 1500);
        idleWanderRef.current.push(departTimer);
      });
    }

    function scheduleWander() {
      const delay = 15000 + Math.random() * 10000; // 15-25s
      const timer = window.setTimeout(() => {
        const allIds: WorkerId[] = ['planner', 'reviewer', 'coder', 'tester', 'supervisor', 'security', 'devops'];
        // Filter to agents not actually working in the pipeline
        const available = allIds.filter(id => !activeWorkerIdsRef.current.has(id));
        if (available.length === 0) { scheduleWander(); return; }

        // 25% chance of group gathering when 2+ agents available
        if (available.length >= 2 && Math.random() < 0.25) {
          const shuffled = [...available].sort(() => Math.random() - 0.5);
          const groupSize = Math.min(2 + Math.floor(Math.random() * 2), shuffled.length); // 2-3 agents
          const group = shuffled.slice(0, groupSize);
          const spotChoices = ['hookah', 'couch', 'pingpong'] as const;
          const spot = spotChoices[Math.floor(Math.random() * spotChoices.length)];
          sendGroup(spot, group);
          scheduleWander();
          return;
        }

        // Pick a random available agent
        const wId = available[Math.floor(Math.random() * available.length)];

        // Figure out current position (use ref for fresh state)
        const currentIdle = idlePositionsRef.current;
        const currentPos = currentIdle[wId] || homePositions[wId];
        const isOut = currentIdle[wId] != null;

        if (isOut) {
          // Walk home — set facing based on direction, then clear after arrival
          const home = homePositions[wId];
          const facing = home.x < currentPos.x ? 'left' as const : 'right' as const;
          setWalkingIds(p => new Set([...p, wId]));
          setIdlePositions(prev => ({ ...prev, [wId]: { x: home.x, y: home.y, facing } }));
          const stopTimer = window.setTimeout(() => {
            setWalkingIds(p => { const n = new Set(p); n.delete(wId); return n; });
            setIdlePositions(prev => ({ ...prev, [wId]: null }));
          }, 2600);
          idleWanderRef.current.push(stopTimer);
        } else {
          // Walk to a random spot — avoid spots occupied by other agents
          const occupiedPositions = Object.values(idlePositionsRef.current).filter(Boolean) as WorkerPos[];
          const startIdx = Math.floor(Math.random() * idleSpots.length);
          let spot = idleSpots[startIdx];
          for (let attempt = 0; attempt < idleSpots.length; attempt++) {
            const candidate = idleSpots[(startIdx + attempt) % idleSpots.length];
            const tooClose = occupiedPositions.some(
              p => Math.abs(p.x - candidate.x) < 60 && Math.abs(p.y - candidate.y) < 40
            );
            if (!tooClose) { spot = candidate; break; }
          }
          const isCouch = spot.label === 'couch';
          const isHookah = spot.label === 'hookah';
          const isPingPong = spot.label === 'pingpong';
          const isGroupSpot = isCouch || isHookah || isPingPong;
          const spotFacing = isCouch
            ? 'back' as const
            : isHookah
            ? 'front' as const
            : isPingPong
            ? (spot.x < 210 ? 'right' as const : 'left' as const)
            : spot.x < currentPos.x ? 'left' as const : 'right' as const;

          setWalkingIds(p => new Set([...p, wId]));
          setIdlePositions(prev => ({ ...prev, [wId]: { x: spot.x, y: spot.y, facing: spotFacing } }));
          const stopTimer = window.setTimeout(() => {
            setWalkingIds(p => { const n = new Set(p); n.delete(wId); return n; });
          }, 2600);
          idleWanderRef.current.push(stopTimer);

          // Group spots: return home after 30-60s
          if (isGroupSpot) {
            const returnTimer = window.setTimeout(() => {
              const home = homePositions[wId];
              const returnFacing = home.x < spot.x ? 'left' as const : 'right' as const;
              setWalkingIds(p => new Set([...p, wId]));
              setIdlePositions(p => ({ ...p, [wId]: { x: home.x, y: home.y, facing: returnFacing } }));
              const returnStop = window.setTimeout(() => {
                setWalkingIds(p => { const n = new Set(p); n.delete(wId); return n; });
                setIdlePositions(p => ({ ...p, [wId]: null }));
              }, 2600);
              idleWanderRef.current.push(returnStop);
            }, 30000 + Math.random() * 30000);
            idleWanderRef.current.push(returnTimer);
          }
        }

        scheduleWander();
      }, delay);
      idleWanderRef.current.push(timer);
    }

    scheduleWander();
    return () => idleWanderRef.current.forEach(t => window.clearTimeout(t));
  }, [activePhase]);

  // Speech only shows after walking stops, randomized per agent per phase
  const [showSpeech, setShowSpeech] = useState(false);
  const [currentSpeech, setCurrentSpeech] = useState<Record<AgentId, string>>({
    A: '', B: '', C: '', D: '', E: '', F: '', S: '',
  });
  useLayoutEffect(() => {
    setShowSpeech(false);
    setCurrentSpeech({
      A: getRandomSpeech('A', activePhase),
      B: getRandomSpeech('B', activePhase),
      C: getRandomSpeech('C', activePhase),
      D: getRandomSpeech('D', activePhase),
      E: getRandomSpeech('E', activePhase),
      F: getRandomSpeech('F', activePhase),
      S: getRandomSpeech('S', activePhase),
    });
    const timer = window.setTimeout(() => setShowSpeech(true), 3200);
    return () => window.clearTimeout(timer);
  }, [activePhase]);

  const activeWorkerIds = new Set<WorkerId>();
  for (const [agentId, status] of Object.entries(agentStatus)) {
    if (status === 'active' || status === 'working') {
      const wId = AGENT_TO_WORKER[agentId as AgentId];
      if (wId) activeWorkerIds.add(wId);
    }
  }

  const activeWorkerIdsRef = useRef<Set<WorkerId>>(activeWorkerIds);
  // eslint-disable-next-line react-hooks/immutability
  activeWorkerIdsRef.current = activeWorkerIds;

  // Check if both ping pong spots are occupied
  const pingPongSpots = idleSpots.filter(s => s.label === 'pingpong');
  const pingPongPlayers = Object.values(idlePositions).filter(
    p => p && pingPongSpots.some(s => Math.abs(s.x - p.x) < 10 && Math.abs(s.y - p.y) < 10)
  ).length;
  const pingPongActive = pingPongPlayers >= 2;

  // Check if anyone is at the hookah
  const hookahSpots = idleSpots.filter(s => s.label === 'hookah');
  const hookahActive = Object.values(idlePositions).some(
    p => p && hookahSpots.some(s => Math.abs(s.x - p.x) < 10 && Math.abs(s.y - p.y) < 10)
  );

  const label = phaseLabels[activePhase] || activePhase;
  const tickerText = `/// PIPELINE FEED /// ${label.toUpperCase()} /// THE DEV SQUAD /// AGENTS: 7 /// BUILD IN PROGRESS /// `;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0e0c10] p-1 sm:p-2">
      <div ref={sceneRef} className="overflow-hidden rounded-xl border border-[#4a3a36]" style={{ height: SCENE_H * scale }}>
        <div className="relative origin-top-left" style={{ width: SCENE_W, height: SCENE_H, transform: `scale(${scale})` }}>

          {/* === SPACE ROOM BACKGROUND === */}

          {/* Upper wall — space window area */}
          <div className="absolute inset-x-0 top-0 h-[48%] bg-[linear-gradient(180deg,#3b4855_0%,#59636e_18%,#707883_40%,#5f6673_100%)]" />

          {/* Space window — inset from sides for wall decorations */}
          <div className="absolute left-[6%] top-[2%] right-[6%] h-[42%] rounded-[20px] border-[5px] border-[#8d847a] bg-[linear-gradient(180deg,#11161d_0%,#0a0d12_100%)] shadow-[inset_0_0_0_2px_rgba(255,255,255,0.06)] overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(50,82,134,0.34),transparent_38%),linear-gradient(180deg,#0b0f15_0%,#121822_100%)]" />

            {/* Stars — more of them for a bigger window */}
            {stars.map((star, i) => (
              <motion.span
                key={i}
                className="absolute rounded-full bg-white/80"
                style={{ left: star.left, top: star.top, width: star.size, height: star.size }}
                animate={{ opacity: [0.2, 0.9, 0.2] }}
                transition={{ duration: 1.8 + i * 0.3, repeat: Infinity, ease: 'easeInOut' }}
              />
            ))}
            {/* Extra stars to fill the bigger window */}
            {[
              { left: 130, top: 22, size: 2 }, { left: 290, top: 60, size: 2 },
              { left: 420, top: 15, size: 3 }, { left: 580, top: 68, size: 2 },
              { left: 720, top: 25, size: 2 }, { left: 870, top: 55, size: 3 },
              { left: 1030, top: 18, size: 2 }, { left: 1140, top: 45, size: 2 },
              { left: 40, top: 50, size: 2 }, { left: 460, top: 42, size: 2 },
            ].map((star, i) => (
              <motion.span
                key={`extra-${i}`}
                className="absolute rounded-full bg-white/60"
                style={{ left: star.left, top: star.top, width: star.size, height: star.size }}
                animate={{ opacity: [0.15, 0.7, 0.15] }}
                transition={{ duration: 2.2 + i * 0.4, repeat: Infinity, ease: 'easeInOut' }}
              />
            ))}

            {/* Earth — blue marble with continents and clouds */}
            <motion.div
              className="absolute right-[7%] top-[6%] h-[110px] w-[110px] rounded-full shadow-[0_0_80px_rgba(70,140,255,0.3),inset_-8px_-4px_20px_rgba(0,0,0,0.4)]"
              style={{
                background: 'radial-gradient(circle at 38% 32%, #4da6ff 0%, #2878d0 25%, #1a5fb0 45%, #1848a0 65%, #0d2d6b 100%)',
              }}
              animate={{ y: [0, -4, 0], rotate: [0, 2, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            >
              {/* Continents */}
              <div className="absolute left-[20%] top-[18%] h-[22%] w-[28%] rounded-[40%] bg-[#3a8a4a]/60 rotate-[-15deg]" />
              <div className="absolute left-[50%] top-[30%] h-[18%] w-[20%] rounded-[40%] bg-[#3a8a4a]/50 rotate-[10deg]" />
              <div className="absolute left-[15%] top-[50%] h-[20%] w-[35%] rounded-[40%] bg-[#3a8a4a]/45 rotate-[-8deg]" />
              <div className="absolute left-[55%] top-[55%] h-[15%] w-[22%] rounded-[40%] bg-[#3a8a4a]/40 rotate-[20deg]" />
              <div className="absolute left-[30%] top-[10%] h-[10%] w-[18%] rounded-[40%] bg-[#5aaa5a]/30" />
              {/* Ice caps */}
              <div className="absolute left-[25%] top-[3%] h-[8%] w-[40%] rounded-full bg-white/30" />
              <div className="absolute left-[20%] bottom-[5%] h-[7%] w-[35%] rounded-full bg-white/25" />
              {/* Cloud swirls */}
              <div className="absolute left-[10%] top-[25%] h-[6%] w-[45%] rounded-full bg-white/20 rotate-[-5deg]" />
              <div className="absolute left-[30%] top-[42%] h-[5%] w-[40%] rounded-full bg-white/18 rotate-[8deg]" />
              <div className="absolute left-[5%] top-[60%] h-[5%] w-[35%] rounded-full bg-white/15 rotate-[-3deg]" />
              <div className="absolute left-[45%] top-[70%] h-[4%] w-[30%] rounded-full bg-white/15 rotate-[12deg]" />
              {/* Atmosphere rim */}
              <div className="absolute inset-[-3px] rounded-full border-2 border-[#6ab4ff]/20" />
              <div className="absolute inset-[-1px] rounded-full" style={{ background: 'radial-gradient(circle at 30% 30%, transparent 50%, rgba(100,180,255,0.15) 100%)' }} />
            </motion.div>

            {/* Subtle nebula glow */}
            <div className="absolute left-[15%] top-[10%] h-[60%] w-[25%] rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.06),transparent_60%)]" />
            <div className="absolute left-[45%] top-[20%] h-[50%] w-[20%] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.04),transparent_60%)]" />

            {/* Lunar surface outside the window — grey, cratered */}
            <div className="absolute inset-x-0 bottom-0 h-[32%] bg-[linear-gradient(180deg,#9a9a9f_0%,#7d7d82_30%,#6a6a70_60%,#555560_100%)]" />
            {/* Craters */}
            <div className="absolute bottom-[12%] left-[8%] h-[14%] w-[18%] rounded-[50%] bg-[#727278] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-1px_-1px_2px_rgba(255,255,255,0.1)]" />
            <div className="absolute bottom-[8%] left-[28%] h-[18%] w-[24%] rounded-[50%] bg-[#6a6a70] shadow-[inset_2px_3px_5px_rgba(0,0,0,0.25),inset_-1px_-1px_3px_rgba(255,255,255,0.08)]" />
            <div className="absolute bottom-[14%] left-[55%] h-[10%] w-[12%] rounded-[50%] bg-[#757580] shadow-[inset_1px_1px_3px_rgba(0,0,0,0.3)]" />
            <div className="absolute bottom-[10%] right-[12%] h-[16%] w-[20%] rounded-[50%] bg-[#6e6e75] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.25),inset_-1px_-1px_2px_rgba(255,255,255,0.08)]" />
            <div className="absolute bottom-[20%] left-[42%] h-[6%] w-[8%] rounded-[50%] bg-[#808088] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.2)]" />
            <div className="absolute bottom-[6%] left-[70%] h-[8%] w-[10%] rounded-[50%] bg-[#737380] shadow-[inset_1px_1px_3px_rgba(0,0,0,0.2)]" />
            {/* Lunar dust/texture */}
            <div className="absolute inset-x-0 bottom-0 h-[32%] bg-[radial-gradient(circle_at_20%_80%,rgba(255,255,255,0.04),transparent_30%),radial-gradient(circle_at_70%_90%,rgba(255,255,255,0.03),transparent_25%)]" />

            {/* Distant structures on lunar surface */}
            <div className="absolute left-[8%] bottom-[20%] h-[10%] w-[4%] rounded-t-[4px] bg-[#8a8a90]" />
            <div className="absolute left-[9%] bottom-[28%] h-[6%] w-[1px] bg-[#aeb4bc]" />
            <div className="absolute left-[9%] bottom-[32%] h-[3%] w-[3%] rounded-full border border-[#aeb4bc] bg-transparent" />
            <div className="absolute left-[50%] bottom-[16%] h-[6%] w-[6%] rounded-t-[4px] bg-[#8a8a90]" />
            <div className="absolute left-[51.5%] bottom-[22%] h-[4%] w-[3%] rounded-[2px] bg-[#9a9aa0]" />
          </div>

          {/* Structural ribs on the wall */}
          {[10, 35, 60, 85].map((pct) => (
            <div
              key={`rib-${pct}`}
              className="absolute top-0 h-[48%] w-[2px]"
              style={{ left: `${pct}%`, background: 'linear-gradient(180deg, rgba(210,210,210,0.08), rgba(76,86,95,0.3), rgba(39,44,50,0.2))' }}
            />
          ))}

          {/* Ceiling lights */}
          {[8, 38, 68].map((pct) => (
            <div
              key={`light-${pct}`}
              className="absolute top-[2%] h-[4%] w-[18%] rounded-[3px] border border-[#4d5057] bg-[#d8c58b]"
              style={{ left: `${pct}%` }}
            >
              <div className="absolute inset-[10%] rounded-[2px] bg-[#fff3a5]" />
              <div className="absolute inset-x-[12%] bottom-[-100%] h-[180%] bg-[radial-gradient(ellipse_at_top,rgba(255,228,132,0.18),transparent_70%)]" />
            </div>
          ))}

          {/* Floor area — dark metallic space station */}
          <div className="absolute inset-x-0 top-[46%] bottom-[5%] bg-[linear-gradient(180deg,#5c535f_0%,#514854_20%,#413945_60%,#352c3a_100%)]" />

          {/* Floor bottom strip */}
          <div className="absolute inset-x-0 bottom-[5%] h-[2%] bg-[linear-gradient(180deg,#1f1e26_0%,#08090d_100%)]" />

          {/* Wall trim line */}
          <div className="absolute inset-x-0 top-[46%] h-[2px] bg-[#697582]/40" />
          <div className="absolute inset-x-0 top-[46.3%] h-[1px] bg-white/5" />

          {/* Floor lane markers */}
          <div className="absolute left-[5%] right-[5%] top-[72%] h-[1px] bg-white/6" />

          {/* Ambient ceiling light glow on floor */}
          <div className="absolute inset-x-0 top-[46%] h-[25%] bg-[radial-gradient(ellipse_at_20%_0%,rgba(255,220,150,0.05),transparent_45%)]" />
          <div className="absolute inset-x-0 top-[46%] h-[25%] bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,220,150,0.04),transparent_40%)]" />
          <div className="absolute inset-x-0 top-[46%] h-[25%] bg-[radial-gradient(ellipse_at_80%_0%,rgba(255,220,150,0.05),transparent_45%)]" />

          {/* === PIXEL ART FURNITURE ON TOP === */}

          {/* Side wall items — CSS */}
          <CSSChart x={8} y={70} w={65} h={55} type="line" />
          <CSSChart x={10} y={140} w={60} h={32} type="bar" />
          <CSSWhiteboard x={2} y={175} w={75} h={42} />
          <Sprite src="/sprites/watercooler.png" x={-20} y={150} w={140} h={206} z={5} />
          <CSSChart x={1130} y={70} w={60} h={50} type="line" />
          <CSSChart x={1132} y={130} w={55} h={30} type="bar" />
          <CSSCalendar x={1132} y={170} w={55} h={50} />

          {/* Floor props — CSS */}
          <CSSNameplate x={960} y={240} w={50} h={20} />
          <CSSPlant x={240} y={230} w={28} h={48} />
          <CSSPlant x={470} y={230} w={28} h={48} />
          <CSSPlant x={690} y={230} w={28} h={48} />
          <CSSPlant x={1140} y={225} w={28} h={48} />

          {/* Ping pong table — original sprite */}
          <Sprite src="/sprites/pingpong.png" x={160} y={440} w={144} h={72} z={21} />
          {/* Ping pong ball — only when both players are there */}
          {pingPongActive && (
            <motion.div
              className="absolute z-[22] rounded-full bg-orange-300"
              style={{ width: 6, height: 6 }}
              animate={{
                left: [195, 260, 200, 255, 190, 268, 198, 252, 195],
                top:  [470, 476, 465, 480, 472, 467, 482, 468, 470],
                y:    [0, -3, 0, -4, 0, -2, 0, -5, 0],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear', times: [0, 0.12, 0.25, 0.37, 0.5, 0.62, 0.75, 0.87, 1] }}
            />
          )}

          {/* Hookah lounge — original sprites */}
          <Sprite src="/sprites/cushion.png" x={815} y={455} w={48} h={24} z={6} />
          <Sprite src="/sprites/cushion.png" x={931} y={455} w={48} h={24} z={6} />
          <Sprite src="/sprites/cushion.png" x={873} y={500} w={48} h={24} z={6} />
          <Sprite src="/sprites/hookah.png" x={846} y={382} w={128} h={128} z={21} />
          {/* Hookah smoke — only when someone is using it */}
          {hookahActive && <>
            <motion.div
              className="absolute z-[26] rounded-full bg-white/30 blur-[3px]"
              style={{ left: 912, top: 420, width: 8, height: 8 }}
              animate={{ y: [0, -30, -60], opacity: [0, 0.7, 0], scale: [0.5, 1.2, 0.8] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeOut' }}
            />
            <motion.div
              className="absolute z-[26] rounded-full bg-white/25 blur-[2px]"
              style={{ left: 920, top: 425, width: 6, height: 6 }}
              animate={{ y: [0, -25, -50], x: [0, 5, 8], opacity: [0, 0.6, 0], scale: [0.4, 1, 0.6] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeOut', delay: 1 }}
            />
            <motion.div
              className="absolute z-[26] rounded-full bg-white/20 blur-[3px]"
              style={{ left: 906, top: 422, width: 10, height: 10 }}
              animate={{ y: [0, -35, -55], x: [0, -4, -7], opacity: [0, 0.65, 0], scale: [0.3, 1.1, 0.5] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeOut', delay: 2 }}
            />
            <motion.div
              className="absolute z-[26] rounded-full bg-white/20 blur-[2px]"
              style={{ left: 916, top: 418, width: 7, height: 7 }}
              animate={{ y: [0, -40, -70], x: [0, -3, 2], opacity: [0, 0.55, 0], scale: [0.6, 1.3, 0.4] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeOut', delay: 0.5 }}
            />
            <motion.div
              className="absolute z-[26] rounded-full bg-white/15 blur-[3px]"
              style={{ left: 910, top: 423, width: 12, height: 12 }}
              animate={{ y: [0, -20, -45], x: [0, 6, 10], opacity: [0, 0.5, 0], scale: [0.3, 1, 0.7] }}
              transition={{ duration: 3.8, repeat: Infinity, ease: 'easeOut', delay: 1.5 }}
            />
          </>}

          {/* TV + couch */}
          <Sprite src="/sprites/tv.png" x={990} y={295} w={230} h={158} z={6} />
          <Sprite src="/sprites/couch.png" x={980} y={390} w={240} h={160} z={25} />

          {/* "Water pipe" — on Reviewer's desk */}
          <WaterPipe x={390} y={245} />

          {/* Desks with chairs BEHIND (below desk = higher Y) */}
          {desks.map((d, i) => (
            <div key={`desk-${i}`}>
              <Sprite src="/sprites/desk.png" x={d.desk.x} y={d.desk.y} w={d.desk.w} h={d.desk.h} z={10} />
              <Sprite src="/sprites/chair.png" x={d.chair.x} y={d.chair.y} w={85} h={93} z={25} />
              {activeWorkerIds.has(workers[i]?.id) && (
                <motion.div
                  className="absolute z-[9] rounded-xl"
                  style={{ left: d.desk.x - 6, top: d.desk.y - 6, width: d.desk.w + 12, height: d.desk.h + 12 }}
                  animate={{ boxShadow: ['0 0 15px rgba(124,58,237,0.2)', '0 0 30px rgba(124,58,237,0.45)', '0 0 15px rgba(124,58,237,0.2)'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
            </div>
          ))}

          {/* Agent characters */}
          {workers.map((w) => {
            const wId = w.id as WorkerId;
            const phaseOverride = phasePositions[activePhase]?.[wId];
            const idleOverride = idlePositions[wId];
            const home = homePositions[wId];
            const pos = phaseOverride || idleOverride || home;
            const isActive = activeWorkerIds.has(wId);
            const isWalking = walkingIds.has(wId);
            const speech = latestSpeech[w.agentId];
            // "Waiting" = at a phase interaction position but partner is the active one
            const isWaiting = !!phaseOverride && !isActive && !isWalking;

            // Show speech bubbles for active agents
            const bubbleText = isActive && !isWalking
              ? (speech || (showSpeech ? currentSpeech[w.agentId] : null))
              : null;

            return (
              <div key={w.id} onClick={() => onAgentClick?.(w.agentId)} className="cursor-pointer">
                <PixelSprite
                  id={w.id}
                  name={w.name}
                  title={w.title}
                  bodyColor={w.color}
                  x={pos.x}
                  y={pos.y}
                  isActive={isActive}
                  isWalking={isWalking}
                  isWaiting={isWaiting}
                  facing={pos.facing}
                  carrying={phaseCarriers[activePhase] === wId}
                  speech={bubbleText}
                />
              </div>
            );
          })}

          {/* Sector label */}
          <div className="absolute left-3 top-3 z-30 rounded-md border border-white/10 bg-black/50 px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.24em] text-[#d7d4cd]">
            Mission Control
          </div>

          {/* Phase overlay */}
          <div className="absolute right-3 top-3 z-30 rounded-md border border-white/10 bg-black/60 px-3 py-2 text-right backdrop-blur-sm">
            <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#c8b9a7]">The Dev Squad</p>
            <p className="mt-0.5 text-sm font-semibold text-white">{label}</p>
          </div>

          {/* Data packet removed */}

          {/* Ticker */}
          <div className="absolute inset-x-0 bottom-0 z-30 h-[22px] overflow-hidden border-t border-[#38313a] bg-black/90">
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap font-mono text-[10px] text-[#35f38f]/80"
              animate={{ x: [0, -1200] }}
              transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
            >
              {tickerText}{tickerText}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
