// Makes a review copy of the built site in preview/ that works from any
// folder or host: every root-relative link (/about/) becomes a relative file
// path (../about/index.html). Used for the sign-off preview link; the live
// site is published from dist/ as it is. Run `npm run build` first.
import { readFile, writeFile, rm, cp, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const out = path.join(root, 'preview');

async function list(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await list(full)));
    else files.push(full);
  }
  return files;
}

// "/about/#team" seen from contact/index.html -> "../about/index.html#team"
function relative(url, fromFile) {
  const [, p, rest = ''] = url.match(/^([^?#]*)(.*)$/);
  const target = p.endsWith('/') ? p + 'index.html' : p;
  const rel = path.posix.relative(path.posix.dirname('/' + fromFile), target);
  return (rel || 'index.html') + rest;
}

const fix = (text, file) =>
  text
    .replace(/(href|src|action)="(\/(?!\/)[^"]*)"/g, (_, attr, url) => `${attr}="${relative(url, file)}"`)
    .replace(/srcset="([^"]*)"/g, (_, set) => `srcset="${set.replace(/(^|,\s*)(\/(?!\/)\S+)/g, (m, sep, url) => sep + relative(url, file))}"`)
    .replace(/url\("(\/(?!\/)[^"]*)"\)/g, (_, url) => `url("${relative(url, file)}")`);

await rm(out, { recursive: true, force: true });
await cp(dist, out, { recursive: true, filter: (f) => !f.startsWith(path.join(dist, 'admin')) });
for (const full of await list(out)) {
  const file = path.relative(out, full).split(path.sep).join('/');
  if (file.endsWith('.html') || file.endsWith('.css')) await writeFile(full, fix(await readFile(full, 'utf8'), file));
  // The contact form island links to the privacy notice; it only runs on /contact/.
  if (file === 'assets/js/contact-form.react.js') await writeFile(full, (await readFile(full, 'utf8')).replaceAll('"/privacy/"', '"../privacy/index.html"'));
}
console.log(`preview/ written: ${(await list(out)).length} files with relative links`);
