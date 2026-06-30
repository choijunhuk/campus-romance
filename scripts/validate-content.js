#!/usr/bin/env node
/**
 * Content validator for "Campus Romance".
 *
 * Catches the data/engine contract breaks the runtime swallows silently:
 *   - goto / next_scene targets that don't resolve (the bug that ate node-level goto)
 *   - unknown keys on nodes/choices (typos that zod strips without complaint)
 *   - speakers/expressions/backgrounds the engine or asset set can't honour
 *   - declared route/CG content with no scene file or image on disk
 *
 * Errors -> exit 1 (block the build). Warnings -> exit 0 (content gaps, surfaced).
 *
 * Usage: node scripts/validate-content.js
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'src/data');
const SCENES = join(DATA, 'scenes');
const ASSETS = join(ROOT, 'public/assets');

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

const readJSON = (p) => JSON.parse(readFileSync(p, 'utf8'));

// ── Load data ────────────────────────────────────────────────────────────────
const characters = readJSON(join(DATA, 'characters.json'));
const routes = readJSON(join(DATA, 'routes.json'));
const prompts = existsSync(join(DATA, 'image_prompts.json'))
  ? readJSON(join(DATA, 'image_prompts.json'))
  : null;

const charIds = new Set(characters.map((c) => c.id));
const exprByChar = new Map(characters.map((c) => [c.id, new Set(c.expression_set)]));
const speakers = new Set([...charIds, 'protagonist']);

const bgIds = new Set((prompts?.backgrounds?.list ?? []).map((b) => b.id));
const cgEventIds = new Set((prompts?.event_cg ?? []).map((c) => c.event_id));

const sceneFiles = readdirSync(SCENES).filter((f) => f.endsWith('.json'));
const scenes = new Map();
for (const f of sceneFiles) {
  try {
    const s = readJSON(join(SCENES, f));
    scenes.set(s.scene_id, { ...s, _file: f });
  } catch (e) {
    err(`${f}: invalid JSON — ${e.message}`);
  }
}

// ── Allowed keys (mirrors src/types.ts) ───────────────────────────────────────
const NODE_KEYS = {
  narration: new Set(['type', 'text', 'background', 'bgm_mood', 'goto']),
  dialogue: new Set(['type', 'speaker', 'text', 'expression', 'sprite_position', 'background', 'goto']),
  choice: new Set(['type', 'choices']),
};
const CHOICE_KEYS = new Set(['label', 'affection', 'set_flags', 'background', 'goto']);

const isSentinel = (s) => s === 'BRANCH_TO_ROUTE' || s.startsWith('EVAL_ENDING:');

// ── Validate each scene ────────────────────────────────────────────────────────
for (const scene of scenes.values()) {
  const where = scene._file;
  const nodes = scene.nodes ?? [];
  const last = nodes.length - 1;

  // next_scene resolves?
  const ns = scene.next_scene;
  if (ns != null && typeof ns === 'string' && !isSentinel(ns) && !scenes.has(ns)) {
    err(`${where}: next_scene "${ns}" — no such scene`);
  }
  if (typeof ns === 'string' && ns.startsWith('EVAL_ENDING:')) {
    const cid = ns.slice('EVAL_ENDING:'.length);
    if (!charIds.has(cid)) err(`${where}: EVAL_ENDING target "${cid}" — unknown character`);
  }

  if (scene.background && bgIds.size && !bgIds.has(scene.background))
    warn(`${where}: background "${scene.background}" has no image_prompts entry`);

  nodes.forEach((n, i) => {
    const at = `${where} node[${i}]`;
    const allowed = NODE_KEYS[n.type];
    if (!allowed) {
      err(`${at}: unknown node type "${n.type}"`);
      return;
    }
    for (const k of Object.keys(n))
      if (!allowed.has(k)) warn(`${at}: unknown key "${k}" (ignored by engine)`);

    if (n.background && bgIds.size && !bgIds.has(n.background))
      warn(`${at}: background "${n.background}" has no image_prompts entry`);

    // goto on a node: number must be in range, string scene must exist
    checkGoto(n.goto, nodes, last, at);

    if (n.type === 'dialogue') {
      if (!speakers.has(n.speaker)) err(`${at}: unknown speaker "${n.speaker}"`);
      if (n.expression && charIds.has(n.speaker) && !exprByChar.get(n.speaker).has(n.expression))
        err(`${at}: expression "${n.expression}" not in ${n.speaker} expression_set`);
    }

    if (n.type === 'choice') {
      if (!Array.isArray(n.choices) || n.choices.length === 0)
        err(`${at}: choice node has no choices`);
      (n.choices ?? []).forEach((c, ci) => {
        const cat = `${at}.choice[${ci}]`;
        for (const k of Object.keys(c))
          if (!CHOICE_KEYS.has(k)) warn(`${cat}: unknown key "${k}" (ignored)`);
        if (!c.label) err(`${cat}: missing label`);
        for (const aid of Object.keys(c.affection ?? {}))
          if (!charIds.has(aid)) err(`${cat}: affection targets unknown character "${aid}"`);
        checkGoto(c.goto, nodes, last, cat);
      });
    }
  });

  // Reachability: walk the goto graph from node 0; any node never reached is an
  // orphan — dead authored content (e.g. a reply a mis-aimed choice goto skips).
  const reach = new Set();
  const stack = nodes.length ? [0] : [];
  while (stack.length) {
    const i = stack.pop();
    if (i == null || i < 0 || i > last || reach.has(i)) continue;
    reach.add(i);
    const n = nodes[i];
    const edges = [];
    if (n.type === 'choice') {
      for (const c of n.choices ?? [])
        edges.push(typeof c.goto === 'number' ? c.goto : c.goto == null ? i + 1 : null);
    } else if (typeof n.goto === 'number') {
      edges.push(n.goto);
    } else if (n.goto == null) {
      edges.push(i + 1); // string goto leaves the scene → no internal edge
    }
    for (const e of edges) if (typeof e === 'number' && e <= last) stack.push(e);
  }
  nodes.forEach((_, i) => {
    if (!reach.has(i)) warn(`${where} node[${i}]: unreachable (orphaned content)`);
  });
}

function checkGoto(goto, nodes, last, at) {
  if (goto == null) return;
  if (typeof goto === 'number') {
    if (!Number.isInteger(goto) || goto < 0 || goto > last)
      err(`${at}: goto ${goto} out of range (0..${last})`);
  } else if (typeof goto === 'string') {
    if (!isSentinel(goto) && !scenes.has(goto)) err(`${at}: goto "${goto}" — no such scene`);
  }
}

// ── Cross-checks: declared routes & endings ───────────────────────────────────
function checkCg(eventId) {
  if (cgEventIds.size && !cgEventIds.has(eventId))
    warn(`CG: "${eventId}" has no event_cg prompt (gallery slot will be placeholder)`);
  if (!existsSync(join(ASSETS, 'cg', `${eventId}.png`)))
    warn(`CG: "${eventId}" has no generated image at public/assets/cg/${eventId}.png`);
}

for (const route of routes.character_routes ?? []) {
  for (const sc of route.scenes ?? [])
    if (!scenes.has(sc.scene_id))
      warn(`routes.json: declared scene "${sc.scene_id}" (${route.char_id}) has no file`);
  for (const tier of ['good', 'normal', 'bad']) {
    const sceneId = `end_${route.char_id}_${tier}`;
    if (!scenes.has(sceneId)) warn(`routes.json: ending scene "${sceneId}" missing`);
    const eventId = `${route.char_id}_${tier}_ending`;
    checkCg(eventId);
  }
}

if (routes.solo_route?.scene_id) {
  if (!scenes.has(routes.solo_route.scene_id))
    warn(`routes.json: solo scene "${routes.solo_route.scene_id}" missing`);
  checkCg('solo_ending');
}

// ── Ending scenes referenced but unreachable check (light) ────────────────────
// every EVAL_ENDING:char_xx implies end_char_xx_{good,normal,bad} must exist (checked above)

// ── Report ─────────────────────────────────────────────────────────────────────
const C = { red: '\x1b[31m', yellow: '\x1b[33m', green: '\x1b[32m', dim: '\x1b[2m', reset: '\x1b[0m' };
console.log(`\n[validate] ${scenes.size} scenes, ${charIds.size} characters\n`);
for (const w of warnings) console.log(`${C.yellow}  warn${C.reset}  ${w}`);
for (const e of errors) console.log(`${C.red} error${C.reset}  ${e}`);
console.log(
  `\n${errors.length ? C.red : C.green}── ${errors.length} error(s), ${warnings.length} warning(s) ──${C.reset}\n`,
);
process.exit(errors.length ? 1 : 0);
