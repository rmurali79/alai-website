// Site rules from CLAUDE.md that generic tools do not check, run on the built dist/:
// one H1 per page, unique title and description, a lang attribute,
// and the motion budget (no autoplay, no banned motion libraries,
// a prefers-reduced-motion rule in the CSS).
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const BANNED = /\b(jquery|gsap|scrolltrigger|lenis|aos(\.min)?\.(js|css)|swiper)\b/i;

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    out.push(...(e.isDirectory() ? await walk(full) : [full]));
  }
  return out;
}

const files = await walk(dist);
const errors = [];
const seen = { title: new Map(), description: new Map() };

for (const file of files.filter((f) => f.endsWith('.html'))) {
  const rel = path.relative(dist, file);
  const html = await readFile(file, 'utf8');
  const h1s = html.match(/<h1\b/gi) ?? [];
  if (h1s.length !== 1) errors.push(`${rel}: has ${h1s.length} <h1> elements, needs exactly 1`);
  if (!/<html\b[^>]*\blang="[a-z-]+"/i.test(html)) errors.push(`${rel}: <html> needs a lang attribute`);

  const title = html.match(/<title>([^<]*)<\/title>/i)?.[1].trim();
  const description = html.match(/<meta name="description" content="([^"]*)"/i)?.[1].trim();
  for (const [key, value] of [['title', title], ['description', description]]) {
    if (!value) errors.push(`${rel}: missing ${key}`);
    else if (seen[key].has(value)) errors.push(`${rel}: ${key} repeats ${seen[key].get(value)}`);
    else seen[key].set(value, rel);
  }

  if (/<(video|audio)\b[^>]*\bautoplay\b/i.test(html)) errors.push(`${rel}: autoplay media breaks the motion budget`);
  if (/<marquee\b/i.test(html)) errors.push(`${rel}: <marquee> breaks the motion budget`);
  for (const src of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/gi)) {
    if (BANNED.test(src[1])) errors.push(`${rel}: loads a banned motion library (${src[1]})`);
  }
}

const css = files.filter((f) => f.endsWith('.css'));
const cssText = (await Promise.all(css.map((f) => readFile(f, 'utf8')))).join('\n');
if (!/@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)/.test(cssText)) {
  errors.push('CSS: needs a @media (prefers-reduced-motion: reduce) rule');
}
for (const f of files.filter((f) => f.endsWith('.js'))) {
  if (BANNED.test(path.basename(f))) errors.push(`${path.relative(dist, f)}: banned motion library`);
}

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join('\n'));
  process.exit(1);
}
console.log(`✓ ${files.filter((f) => f.endsWith('.html')).length} page(s) meet the site rules`);
