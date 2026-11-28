// Site rules from CLAUDE.md that generic tools do not check, run on the built dist/:
// one H1 per page, unique title and description, a lang attribute,
// and the motion budget (no autoplay, no banned motion libraries,
// a prefers-reduced-motion rule in the CSS), React only on Work and Contact,
// valid structured data, and every indexable page listed in sitemap.xml.
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const BANNED = /\b(jquery|gsap|scrolltrigger|lenis|aos(\.min)?\.(js|css)|swiper)\b/i;

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.isDirectory() && e.name === 'admin' && dir === dist) continue; // the admin is not a public page
    const full = path.join(dir, e.name);
    out.push(...(e.isDirectory() ? await walk(full) : [full]));
  }
  return out;
}

const files = await walk(dist);
const sitemap = await readFile(path.join(dist, 'sitemap.xml'), 'utf8').catch(() => '');
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

  for (const ld of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(ld[1]); } catch { errors.push(`${rel}: structured data is not valid JSON`); }
  }
  const noindex = /<meta name="robots" content="noindex">/.test(html);
  if (!noindex) {
    const loc = 'https://alai-labs.com/' + rel.replace(/\\/g, '/').replace(/index\.html$/, '');
    if (!sitemap.includes(`<loc>${loc}</loc>`)) errors.push(`${rel}: missing from sitemap.xml`);
  }
  if (/<(video|audio)\b[^>]*\bautoplay\b/i.test(html)) errors.push(`${rel}: autoplay media breaks the motion budget`);
  if (/<marquee\b/i.test(html)) errors.push(`${rel}: <marquee> breaks the motion budget`);
  for (const src of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/gi)) {
    if (BANNED.test(src[1])) errors.push(`${rel}: loads a banned motion library (${src[1]})`);
  }
  const reactAllowed = /^(work|contact)[\\/]index\.html$/.test(rel);
  if (!reactAllowed && /<script\b[^>]*src="[^"]*react/i.test(html)) errors.push(`${rel}: React is only allowed on the Work and Contact pages`);
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
