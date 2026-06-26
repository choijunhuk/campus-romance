#!/usr/bin/env node
/**
 * Batch image generator for Visual Novel "Campus Romance".
 *
 * Usage:
 *   node scripts/gen-images.js [--dry-run] [--limit N] [--provider NAME]
 *
 * Options:
 *   --dry-run              Print every task that would run; call no API.
 *   --limit N              Cap total generations (skipped files do not count).
 *   --provider NAME        Override IMAGE_PROVIDER env var (gemini|openai|replicate).
 *   --prompts-file PATH    Override default src/data/image_prompts.json path.
 *
 * Output layout (relative to project root):
 *   public/assets/characters/{char_id}_{expression}.png
 *   public/assets/backgrounds/{location_id}_{time}.png
 *   public/assets/cg/{event_id}.png
 *   public/assets/ui/{key}.png
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Bootstrap ────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Load .env (non-fatal if dotenv is absent or file missing)
try {
  const { config } = await import('dotenv');
  config({ path: join(ROOT, '.env') });
} catch {
  // dotenv not installed — env vars must come from the shell
}

// ── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

const limitIdx = args.indexOf('--limit');
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity;
if (limitIdx !== -1 && (Number.isNaN(limit) || limit < 1)) {
  console.error('[error] --limit must be a positive integer');
  process.exit(1);
}

const providerIdx = args.indexOf('--provider');
const providerName =
  (providerIdx !== -1 ? args[providerIdx + 1] : null) ||
  process.env.IMAGE_PROVIDER ||
  'openai';

const promptsFileIdx = args.indexOf('--prompts-file');
const promptsFileOverride = promptsFileIdx !== -1 ? args[promptsFileIdx + 1] : null;

// ── Load provider (skipped in dry-run) ───────────────────────────────────────

let provider = null;
if (!isDryRun) {
  const supported = ['gemini', 'openai', 'replicate', 'local'];
  if (!supported.includes(providerName)) {
    console.error(`[error] Unknown provider "${providerName}". Supported: ${supported.join(', ')}`);
    process.exit(1);
  }
  try {
    const mod = await import(`./providers/${providerName}.js`);
    provider = mod.default;
  } catch (e) {
    console.error(`[error] Failed to load provider "${providerName}": ${e.message}`);
    process.exit(1);
  }
}

// ── Load image_prompts.json ───────────────────────────────────────────────────

const PROMPTS_PATH = promptsFileOverride
  ? resolve(promptsFileOverride)
  : join(ROOT, 'src/data/image_prompts.json');
let prompts = null;

if (existsSync(PROMPTS_PATH)) {
  try {
    prompts = JSON.parse(readFileSync(PROMPTS_PATH, 'utf8'));
    console.log(`[info] Loaded ${PROMPTS_PATH.replace(ROOT, '.')}`);
  } catch (e) {
    console.error(`[error] Cannot parse image_prompts.json: ${e.message}`);
    process.exit(1);
  }
} else {
  console.warn('[warn] src/data/image_prompts.json not found — no tasks to generate.');
  if (!isDryRun) {
    console.error(
      '[error] image_prompts.json is required for actual generation.\n' +
      '        Create the file or run with --dry-run to preview the task list.'
    );
    process.exit(1);
  }
}

// ── Template resolution ───────────────────────────────────────────────────────

/** Walk a dotted path (e.g. "characters.global_style") into the root object. */
function resolvePath(root, dotPath) {
  return dotPath.split('.').reduce((obj, key) => obj?.[key], root);
}

/**
 * Expand all {token} and {a.b.c} placeholders in `str`.
 * Resolution order per token:
 *   1. Dotted path from root JSON (when token contains a dot)
 *   2. Key in `scope` (current section / object)
 *   3. Key at root top-level
 * Loops until the string is stable or maxIter is hit (cycle guard).
 *
 * @param {string} str
 * @param {Record<string,string>} scope  - Local key→value overrides.
 * @param {object} root                  - The full parsed prompts JSON.
 * @param {number} [maxIter=10]
 * @returns {string}
 */
function resolveTemplates(str, scope, root, maxIter = 10) {
  let s = str;
  for (let i = 0; i < maxIter; i++) {
    const next = s.replace(/\{([^}]+)\}/g, (match, token) => {
      if (token.includes('.')) {
        const val = resolvePath(root, token);
        if (typeof val === 'string') return val;
      }
      if (scope && Object.prototype.hasOwnProperty.call(scope, token)) {
        const val = scope[token];
        if (typeof val === 'string') return val;
      }
      if (root && Object.prototype.hasOwnProperty.call(root, token)) {
        const val = root[token];
        if (typeof val === 'string') return val;
      }
      return match; // unresolved — leave for next iteration or as-is
    });
    if (next === s) break;
    s = next;
  }
  return s;
}

// ── Build task queue ──────────────────────────────────────────────────────────

/**
 * @typedef {Object} Task
 * @property {'character'|'background'|'cg'|'ui'} type
 * @property {string}      id
 * @property {string}      label        - Human-readable tag (expression / time / key)
 * @property {string}      prompt
 * @property {string|null} negative
 * @property {number|null} seed
 * @property {string|null} refImagePath - Absolute path to reference image (may not exist yet)
 * @property {string}      outPath      - Absolute output path
 */

function buildQueue(data) {
  /** @type {Task[]} */
  const queue = [];
  if (!data) return queue;

  const OUT = join(ROOT, 'public/assets');

  // Characters ---------------------------------------------------------------
  const chars = data.characters;
  if (chars) {
    const globalStyle = chars.global_style ?? '';
    const globalNeg   = chars.negative ?? null;

    for (const char of chars.list ?? []) {
      // Resolve base_prompt: {global_style} → characters.global_style
      const charScope    = { global_style: globalStyle };
      const expandedBase = resolveTemplates(char.base_prompt ?? '', charScope, data);
      const basePath     = join(OUT, `characters/${char.id}_base.png`);

      // 1. Base image (used only as reference — not an engine asset)
      queue.push({
        type:        'character',
        id:          char.id,
        label:       'base',
        prompt:      expandedBase,
        negative:    globalNeg,
        seed:        char.seed ?? null,
        refImagePath: null,
        outPath:     basePath,
      });

      // 2. Expression variants — {base_prompt} resolves to the expanded base above
      const exprScope = { ...charScope, base_prompt: expandedBase };
      for (const [expr, exprPrompt] of Object.entries(char.expressions ?? {})) {
        queue.push({
          type:        'character',
          id:          char.id,
          label:       expr,
          prompt:      resolveTemplates(exprPrompt, exprScope, data),
          negative:    globalNeg,
          seed:        char.seed ?? null,
          refImagePath: basePath,
          outPath:     join(OUT, `characters/${char.id}_${expr}.png`),
        });
      }
    }
  }

  // Backgrounds --------------------------------------------------------------
  const bgs = data.backgrounds;
  if (bgs) {
    const bgGlobalStyle = bgs.global_style ?? '';
    for (const bg of bgs.list ?? []) {
      // Resolve {global_style} inside bg.base, then use expanded base for time variants
      const bgScope    = { global_style: bgGlobalStyle };
      const expandedBgBase = resolveTemplates(bg.base ?? '', bgScope, data);
      const timeScope  = { ...bgScope, base: expandedBgBase };

      for (const [time, timePrompt] of Object.entries(bg.time_variants ?? {})) {
        queue.push({
          type:        'background',
          id:          bg.id,
          label:       time,
          prompt:      resolveTemplates(timePrompt, timeScope, data),
          negative:    null,
          seed:        null,
          refImagePath: null,
          outPath:     join(OUT, `backgrounds/${bg.id}_${time}.png`),
        });
      }
    }
  }

  // Event CGs ----------------------------------------------------------------
  for (const cg of data.event_cg ?? []) {
    // {characters.global_style} resolves via dotted-path lookup on root
    const refCharBase = cg.ref_char
      ? join(OUT, `characters/${cg.ref_char}_base.png`)
      : null;
    queue.push({
      type:        'cg',
      id:          cg.event_id,
      label:       cg.event_id,
      prompt:      resolveTemplates(cg.prompt ?? '', {}, data),
      negative:    cg.negative ?? null,
      seed:        null,
      refImagePath: refCharBase,
      outPath:     join(OUT, `cg/${cg.event_id}.png`),
    });
  }

  // UI -----------------------------------------------------------------------
  const ui = data.ui ?? {};
  for (const [key, val] of Object.entries(ui)) {
    if (typeof val === 'string') {
      queue.push({
        type:        'ui',
        id:          key,
        label:       key,
        prompt:      val,
        negative:    null,
        seed:        null,
        refImagePath: null,
        outPath:     join(OUT, `ui/${key}.png`),
      });
    }
  }

  return queue;
}

const fullQueue = buildQueue(prompts);

// ── Dry-run output ────────────────────────────────────────────────────────────

if (isDryRun) {
  const display = isFinite(limit) ? fullQueue.slice(0, limit) : fullQueue;
  console.log(`\n[dry-run] Provider : ${providerName}`);
  console.log(`[dry-run] Tasks     : ${display.length} of ${fullQueue.length} total` +
    (isFinite(limit) ? ` (--limit ${limit})` : ''));
  console.log('');

  if (display.length === 0) {
    console.log('  (nothing to generate — check src/data/image_prompts.json)');
  } else {
    const rel = p => p.replace(ROOT + '/', '');
    for (const t of display) {
      const exists = existsSync(t.outPath) ? ' [SKIP-exists]' : '';
      const ref    = t.refImagePath ? ` [ref: ${rel(t.refImagePath)}]` : '';
      console.log(`  [${t.type.padEnd(10)}] ${rel(t.outPath)}${ref}${exists}`);
      console.log(`             prompt: ${t.prompt.slice(0, 90)}${t.prompt.length > 90 ? '…' : ''}`);
      if (t.negative) {
        console.log(`           negative: ${t.negative.slice(0, 80)}${t.negative.length > 80 ? '…' : ''}`);
      }
      if (t.seed != null) console.log(`               seed: ${t.seed}`);
    }
  }
  console.log('');
  process.exit(0);
}

// ── Actual generation ─────────────────────────────────────────────────────────

function ensureDirs() {
  for (const sub of ['characters', 'backgrounds', 'cg', 'ui']) {
    mkdirSync(join(ROOT, 'public/assets', sub), { recursive: true });
  }
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function generateWithRetry(task, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await provider.generate(task.prompt, {
        seed:        task.seed,
        negative:    task.negative,
        refImagePath: task.refImagePath,
      });
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      const wait = 2 ** attempt * 1000; // 2s, 4s
      console.warn(`  [retry ${attempt}/${maxAttempts - 1}] ${err.message} — backoff ${wait}ms`);
      await sleep(wait);
    }
  }
}

ensureDirs();

console.log(`[info] Provider: ${providerName}`);
console.log(`[info] Queue: ${fullQueue.length} tasks${isFinite(limit) ? `, capped at ${limit}` : ''}\n`);

let generated = 0;
let skipped   = 0;
let failed    = 0;

for (const task of fullQueue) {
  if (isFinite(limit) && generated >= limit) {
    console.log(`[info] Reached --limit ${limit}, stopping.`);
    break;
  }

  const rel = task.outPath.replace(ROOT + '/', '');

  if (existsSync(task.outPath)) {
    console.log(`[skip] ${rel}`);
    skipped++;
    continue;
  }

  // If this task needs a reference image that doesn't exist yet, warn but continue
  const refMissing = task.refImagePath && !existsSync(task.refImagePath);
  if (refMissing) {
    console.warn(`[warn] Reference image not yet on disk for ${rel} — generating without reference`);
  }

  const effectiveTask = refMissing
    ? { ...task, refImagePath: null }
    : task;

  process.stdout.write(`[gen]  ${rel} … `);
  try {
    const bytes = await generateWithRetry(effectiveTask);
    writeFileSync(task.outPath, bytes);
    console.log(`${bytes.length} bytes`);
    generated++;
  } catch (err) {
    console.log('FAILED');
    console.error(`       ${err.message}`);
    failed++;
  }
}

console.log(`\n── Summary ──────────────────────────────────`);
console.log(`   Generated : ${generated}`);
console.log(`   Skipped   : ${skipped}`);
console.log(`   Failed    : ${failed}`);
console.log(`────────────────────────────────────────────`);

if (failed > 0) process.exit(1);
