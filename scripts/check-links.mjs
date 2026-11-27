// Internal link check on dist/: every href and src on every page (linked or not)
// must point at a file that exists, and every #fragment at an id on that page.
// External links are not fetched here, so the check never fails because
// another site is slow or blocks robots.
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    out.push(...(e.isDirectory() ? await walk(full) : [full]));
  }
  return out;
}

async function target(file) {
  try {
    const s = await stat(file);
    if (!s.isDirectory()) return file;
    await stat(path.join(file, 'index.html'));
    return path.join(file, 'index.html');
  } catch {
    return null;
  }
}

const pages = (await walk(dist)).filter((f) => f.endsWith('.html'));
const ids = new Map();
const idsOf = async (file) => {
  if (!ids.has(file)) {
    const html = await readFile(file, 'utf8');
    ids.set(file, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  }
  return ids.get(file);
};

const errors = [];
let count = 0;
for (const page of pages) {
  const html = await readFile(page, 'utf8');
  const rel = path.relative(dist, page);
  const refs = [...html.matchAll(/\s(?:href|src|poster)="([^"]+)"/g)].map((m) => m[1]);
  for (const srcset of html.matchAll(/\ssrcset="([^"]+)"/g)) {
    refs.push(...srcset[1].split(',').map((s) => s.trim().split(/\s+/)[0]));
  }
  for (const ref of refs) {
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(ref)) continue; // https:, mailto:, tel:, protocol-relative
    count++;
    const [pathPart, fragment] = ref.split('#');
    const clean = decodeURIComponent(pathPart.split('?')[0]);
    const file = clean === ''
      ? page
      : await target(clean.startsWith('/') ? path.join(dist, clean) : path.resolve(path.dirname(page), clean));
    if (!file) errors.push(`${rel}: broken link ${ref}`);
    else if (fragment && file.endsWith('.html') && !(await idsOf(file)).has(fragment)) {
      errors.push(`${rel}: ${ref} points at a missing #${fragment}`);
    }
  }
}

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join('\n'));
  process.exit(1);
}
console.log(`✓ ${count} internal link(s) on ${pages.length} page(s) resolve`);
