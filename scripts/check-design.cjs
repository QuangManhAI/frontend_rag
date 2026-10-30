#!/usr/bin/env node
/**
 * Design-token guard for frontend_rag (docs/FE_DESIGN_SYSTEM.md §11, docs/FE3d_prompt_v2.md P15).
 *
 *   node scripts/check-design.cjs --report                 # list violations + STATS, exit 0
 *   node scripts/check-design.cjs --strict                 # exit 1 on any violation of the selected rules
 *   node scripts/check-design.cjs --strict --rules=a,b     # only these rules gate (others still reported)
 *   node scripts/check-design.cjs --strict --rules=all-except-trig
 *   node scripts/check-design.cjs --json=out.json          # machine-readable result
 *   node scripts/check-design.cjs --verbose                # every location instead of the first 8 per rule
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const CSS_FILE = path.join(SRC, 'index.css');
const TW_THEME = path.join(ROOT, 'node_modules', 'tailwindcss', 'theme.css');
const rel = (f) => path.relative(ROOT, f).split(path.sep).join('/');

/** Dev-only tooling is exempt from the UI rules (FE_DESIGN_SYSTEM.md §2.5). */
const EXEMPT_UI = new Set(['src/components/world/overlay/PerfHUD.tsx']);
/** The one place allowed to call trig to build rotors (FE_DESIGN_SYSTEM.md §9.4). */
const EXEMPT_TRIG = new Set(['src/utils/rotation.ts']);

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');

// ---------------------------------------------------------------- files

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const isTest = (f) => /\.(test|spec|bench)\.[tj]sx?$/.test(f);
const sourceFiles = walk(SRC).filter((f) => /\.(ts|tsx)$/.test(f) && !isTest(f) && !f.endsWith('.d.ts'));
const tsxFiles = sourceFiles.filter((f) => f.endsWith('.tsx'));
const css = fs.readFileSync(CSS_FILE, 'utf8');

// ---------------------------------------------------------------- css mini-parser

/** Declarations with the chain of enclosing selectors / at-rules and their line number. */
function parseCss(text) {
  const clean = text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  const decls = [];
  const stack = [];
  let buf = '';
  let bufStart = 0;
  const lineAt = (i) => clean.slice(0, i).split('\n').length;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === '{') {
      stack.push(buf.trim());
      buf = '';
      bufStart = i + 1;
    } else if (ch === '}' || ch === ';') {
      const raw = buf.trim();
      const m = raw.match(/^(--[\w-]+|[a-z-]+)\s*:\s*([\s\S]+)$/i);
      if (m) {
        const offset = bufStart + buf.indexOf(raw);
        decls.push({ prop: m[1], value: m[2].replace(/\s+/g, ' ').trim(), line: lineAt(offset), context: [...stack] });
      }
      if (ch === '}') stack.pop();
      buf = '';
      bufStart = i + 1;
    } else {
      buf += ch;
    }
  }
  return decls;
}

const cssDecls = parseCss(css);
const isTokenBlock = (d) => d.context.some((c) => c.startsWith(':root') || c.startsWith('@theme'));

// ---------------------------------------------------------------- variable dictionary

/** Every custom property that exists: declared in CSS, Tailwind's theme, applyCssVars, or set from JS. */
function knownVars() {
  const known = new Set();
  for (const d of cssDecls) if (d.prop.startsWith('--')) known.add(d.prop);
  if (fs.existsSync(TW_THEME)) {
    for (const m of fs.readFileSync(TW_THEME, 'utf8').matchAll(/(--[\w-]+)\s*:/g)) known.add(m[1]);
  }
  for (const f of sourceFiles) {
    for (const m of fs.readFileSync(f, 'utf8').matchAll(/['"`](--[\w-]+)['"`]/g)) known.add(m[1]);
  }
  return known;
}
const KNOWN = knownVars();
const isKnown = (v) => KNOWN.has(v) || /^--cat-(?:\d+)?$/.test(v) || v.startsWith('--tw-');

/** name → raw value, project CSS overriding Tailwind defaults; `--x-*: initial` clears a namespace. */
function varValues() {
  const values = new Map();
  if (fs.existsSync(TW_THEME)) {
    for (const d of parseCss(fs.readFileSync(TW_THEME, 'utf8'))) if (d.prop.startsWith('--')) values.set(d.prop, d.value);
  }
  for (const d of cssDecls) {
    if (!d.prop.startsWith('--')) continue;
    if (d.prop.endsWith('-*') && d.value === 'initial') {
      const prefix = d.prop.slice(0, -1);
      for (const k of [...values.keys()]) if (k.startsWith(prefix)) values.delete(k);
      continue;
    }
    if (isTokenBlock(d)) values.set(d.prop, d.value);
  }
  return values;
}
const VALUES = varValues();

function resolve(value, depth = 0) {
  if (depth > 8) return value;
  return value.replace(/var\((--[\w-]+)(?:\s*,\s*([^)]+))?\)/g, (_, name, fallback) => {
    const v = VALUES.get(name) ?? fallback;
    return v === undefined ? `var(${name})` : resolve(v, depth + 1);
  });
}

function toPx(v) {
  const m = String(v).trim().match(/^(-?[\d.]+)(px|rem)?$/);
  if (!m) return null;
  return Math.round(parseFloat(m[1]) * (m[2] === 'rem' ? 16 : 1) * 100) / 100;
}

// ---------------------------------------------------------------- rules

const COLOR_PALETTE =
  '(?:white|black|(?:red|amber|gray|slate|neutral|zinc|stone|indigo|violet|purple|fuchsia|pink|green|emerald|lime|yellow|blue|sky|cyan|teal|rose|orange)-\\d{2,3})';

const TSX_RULES = [
  { id: 'raw-color', test: (l) => /#[0-9a-fA-F]{3,8}\b/.test(l.replace(/#\{|#\d+\b(?![0-9a-fA-F])/g, '')) || /\brgba?\(/.test(l) },
  { id: 'tw-palette', test: (l) => new RegExp(`\\b(?:bg|text|border|ring|from|to|via|fill|stroke|outline|shadow)-${COLOR_PALETTE}(?:/\\d+)?\\b`).test(l) },
  { id: 'raw-arbitrary', test: (l) => /\b(?:rounded(?:-[a-z]{1,2})?|text|blur|backdrop-blur)-\[\d/.test(l) },
  { id: 'retired-radius', test: (l) => /(?<![\w-])rounded(?:-(?:xl|2xl|3xl))?(?![-\w])/.test(l) },
];

/** `var(--x, fallback)` is a smell only when --x does not exist or the fallback is a hard-coded colour. */
function badFallbacks(text) {
  const out = [];
  for (const m of text.matchAll(/var\((--[\w-]+)\s*,([^)]*\)?)/g)) {
    if (!isKnown(m[1]) || /#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(m[2])) out.push(m[1]);
  }
  return out;
}

const violations = [];
const add = (rule, file, line, text) => violations.push({ rule, file, line, text: text.trim().slice(0, 160) });

for (const file of tsxFiles) {
  const r = rel(file);
  if (EXEMPT_UI.has(r)) continue;
  fs.readFileSync(file, 'utf8')
    .split('\n')
    .forEach((text, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(text)) return; // comment lines
      for (const rule of TSX_RULES) if (rule.test(text)) add(rule.id, r, i + 1, text);
      if (badFallbacks(text).length) add('var-fallback', r, i + 1, text);
    });
}

// unknown CSS variables (tsx + css)
for (const file of [...tsxFiles, CSS_FILE]) {
  const r = rel(file);
  if (EXEMPT_UI.has(r)) continue;
  fs.readFileSync(file, 'utf8')
    .split('\n')
    .forEach((text, i) => {
      for (const m of text.matchAll(/var\((--[\w-]+)/g)) if (!isKnown(m[1])) add('unknown-var', r, i + 1, `${m[1]} — ${text}`);
    });
}
for (const d of cssDecls) if (badFallbacks(d.value).length) add('var-fallback', rel(CSS_FILE), d.line, `${d.prop}: ${d.value}`);

// trig: per-frame callers and everywhere else
for (const file of sourceFiles) {
  const r = rel(file);
  if (EXEMPT_TRIG.has(r)) continue;
  const text = fs.readFileSync(file, 'utf8');
  const inFrame = /\buseFrame\b/.test(text);
  text.split('\n').forEach((line, i) => {
    if (!/Math\.(?:sin|cos|atan2)\(/.test(line) || /trig-ok:/.test(line)) return;
    add(inFrame ? 'trig-in-frame' : 'trig-any', r, i + 1, line);
  });
}

// raw values in index.css outside :root / @theme
const LOOPING = /\binfinite\b/;
for (const d of cssDecls) {
  if (isTokenBlock(d) || d.prop.startsWith('--')) continue;
  const where = rel(CSS_FILE);
  const decl = `${(d.context.at(-1) ?? '').replace(/\s+/g, ' ')} { ${d.prop}: ${d.value} }`;
  if (d.prop === 'border-radius' && /\d(?:px|%)/.test(d.value)) add('css-raw-radius', where, d.line, decl);
  if (/backdrop-filter$/.test(d.prop) && /blur\(\s*[\d.]+px/.test(d.value)) add('css-raw-blur', where, d.line, decl);
  if (d.prop === 'font-size' && /^[\d.]+(?:px|rem)$/.test(d.value)) add('css-raw-size', where, d.line, decl);
  if (/rgba?\(|#[0-9a-fA-F]{3,8}\b/.test(d.value)) add('css-raw-color', where, d.line, decl);
  const noVars = d.value.replace(/var\([^()]*\)/g, ''); // `var(--intro-delay, 0s)` is a token default, not a raw duration
  if (/^(?:transition|animation)(?:-duration)?$/.test(d.prop) && /(?<![\w-])[\d.]+m?s\b/.test(noVars) && !LOOPING.test(d.value) && !/^0\.001ms/.test(d.value)) {
    add('css-raw-duration', where, d.line, decl);
  }
  if (/^(?:transition|animation)(?:-timing-function)?$/.test(d.prop) && /cubic-bezier\(/.test(d.value)) add('css-raw-easing', where, d.line, decl);
}

// ---------------------------------------------------------------- STATS (distinct values on the scale)

function stats() {
  const radius = new Map();
  const blur = new Map();
  const size = new Map();
  const whiteAlpha = new Map();
  const bump = (map, key, where) => map.set(key, [...(map.get(key) ?? []), where]);

  for (const d of cssDecls) {
    if (d.prop.startsWith('--')) continue;
    const v = resolve(d.value);
    if (d.prop === 'border-radius') {
      for (const part of v.split(/\s+/)) {
        const px = toPx(part);
        if (px !== null && px > 0) bump(radius, px >= 999 ? 'full' : `${px}px`, `css:${d.line}`);
        else if (part === '50%') bump(radius, 'full', `css:${d.line}`);
      }
    }
    if (/backdrop-filter$/.test(d.prop)) for (const m of v.matchAll(/blur\(\s*([\d.]+)px/g)) bump(blur, `${m[1]}px`, `css:${d.line}`);
    if (d.prop === 'font-size') {
      const px = toPx(v);
      bump(size, px !== null ? `${px}px` : v, `css:${d.line}`);
    }
  }

  const twPx = (name) => toPx(resolve(VALUES.get(name) ?? ''));
  for (const file of tsxFiles) {
    const r = rel(file);
    if (EXEMPT_UI.has(r)) continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(/(?<![\w-])rounded(?:-(?:t|b|l|r|tl|tr|bl|br|s|e))?(?:-([a-z0-9]+))?(?![\w-])/g)) {
      const key = m[1];
      if (key === 'none') continue;
      if (key === 'full') bump(radius, 'full', r);
      else {
        const px = key ? twPx(`--radius-${key}`) : 4; // bare `rounded` = 0.25rem in Tailwind 4
        bump(radius, px === null ? `rounded-${key}?` : `${px}px`, r);
      }
    }
    for (const m of text.matchAll(/rounded(?:-[a-z]+)?-\[(\d+)px\]/g)) bump(radius, `${m[1]}px`, r);
    for (const m of text.matchAll(/(?<![\w-])backdrop-blur(?:-([a-z0-9]+))?(?![\w-])/g)) {
      const px = twPx(`--blur-${m[1] ?? 'sm'}`);
      bump(blur, px === null ? `backdrop-blur-${m[1]}?` : `${px}px`, r);
    }
    for (const m of text.matchAll(/(?<![\w-])text-(xs|sm|base|lg|xl|2xl|3xl|micro|caption|control|display)(?![\w-])/g)) {
      const px = twPx(`--text-${m[1]}`);
      bump(size, px === null ? `text-${m[1]}?` : `${px}px`, r);
    }
    for (const m of text.matchAll(/text-\[([\d.]+)(px|rem)\]/g)) bump(size, `${toPx(m[1] + m[2])}px`, r);
  }

  const alphaSources = [css, fs.readFileSync(path.join(SRC, 'theme', 'tokens.ts'), 'utf8')];
  for (const text of alphaSources) {
    for (const m of text.matchAll(/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*([\d.]+)\s*\)/g)) bump(whiteAlpha, Number(m[1]).toFixed(2), 'rgba');
    for (const m of text.matchAll(/#ffffff([0-9a-fA-F]{2})\b/gi)) bump(whiteAlpha, (parseInt(m[1], 16) / 255).toFixed(2), 'hex');
  }

  const summarise = (map) => ({ distinct: [...map.keys()].filter((k) => k !== 'full').length, values: Object.fromEntries([...map].map(([k, v]) => [k, v.length])) });
  return { radius: summarise(radius), blur: summarise(blur), whiteAlpha: summarise(whiteAlpha), fontSize: summarise(size) };
}

// ---------------------------------------------------------------- output

const ALL_RULES = [
  'raw-color', 'tw-palette', 'raw-arbitrary', 'retired-radius', 'var-fallback', 'unknown-var',
  'trig-in-frame', 'trig-any',
  'css-raw-radius', 'css-raw-blur', 'css-raw-size', 'css-raw-color', 'css-raw-duration', 'css-raw-easing',
];
const rulesOpt = option('rules');
const gated = !rulesOpt || rulesOpt === 'all'
  ? ALL_RULES
  : rulesOpt === 'all-except-trig'
    ? ALL_RULES.filter((r) => !r.startsWith('trig'))
    : rulesOpt.split(',').map((s) => s.trim());
const unknownRules = gated.filter((r) => !ALL_RULES.includes(r));
if (unknownRules.length) {
  console.error(`Unknown rule(s): ${unknownRules.join(', ')}. Known: ${ALL_RULES.join(', ')}`);
  process.exit(2);
}

const byRule = Object.fromEntries(ALL_RULES.map((r) => [r, violations.filter((v) => v.rule === r)]));
const STATS = stats();
const limit = flag('verbose') ? Infinity : 8;

console.log('\nDesign-token check (docs/FE_DESIGN_SYSTEM.md)\n');
console.log('rule'.padEnd(18) + 'count'.padStart(6) + '  gate');
for (const r of ALL_RULES) console.log(r.padEnd(18) + String(byRule[r].length).padStart(6) + (gated.includes(r) ? '  ●' : ''));
for (const r of ALL_RULES) {
  if (!byRule[r].length) continue;
  console.log(`\n[${r}]`);
  for (const v of byRule[r].slice(0, limit)) console.log(`  ${v.file}:${v.line}  ${v.text}`);
  if (byRule[r].length > limit) console.log(`  … ${byRule[r].length - limit} more (--verbose)`);
}
console.log('\nSTATS (distinct values; "full" not counted)');
for (const [k, s] of Object.entries(STATS)) console.log(`  ${k.padEnd(11)} ${String(s.distinct).padStart(3)}  ${Object.keys(s.values).sort((a, b) => (a === 'full') - (b === 'full') || parseFloat(a) - parseFloat(b)).join(' · ')}`);

const jsonOut = option('json');
if (jsonOut) {
  const counts = Object.fromEntries(ALL_RULES.map((r) => [r, byRule[r].length]));
  fs.writeFileSync(path.resolve(jsonOut), JSON.stringify({ counts, stats: STATS, violations }, null, 2));
}

const failing = gated.reduce((n, r) => n + byRule[r].length, 0);
if (flag('strict') && failing > 0) {
  console.error(`\n✗ ${failing} violation(s) in gated rules: ${gated.filter((r) => byRule[r].length).join(', ')}`);
  process.exit(1);
}
console.log(flag('strict') ? '\n✓ no violations in gated rules' : '');
