// Builds the site: stamps the shared layout, header and footer into each page
// in src/pages and writes plain HTML to dist/. Assets are copied as they are.
// No dependencies, so the published site is exactly what you see in dist/.
import { readFile, writeFile, mkdir, rm, cp, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as esbuild } from 'esbuild';
import { buildAdmin } from './cms.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src');
const out = path.join(root, 'dist');
const SITE = 'https://alai-labs.com';

async function listHtml(dir, base = dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await listHtml(full, base)));
    else if (entry.name.endsWith('.html')) files.push(path.relative(base, full));
  }
  return files.sort();
}

// A page starts with a front-matter block of "key: value" lines between --- markers.
export function parsePage(text, file) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error(`${file}: missing front matter (--- title/description ---)`);
  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim()) continue;
    const i = line.indexOf(':');
    if (i < 0) throw new Error(`${file}: bad front-matter line "${line}"`);
    meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { meta, body: match[2] };
}

const escapeAttr = (s) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// URL path a page is served at: index.html -> /, about/index.html -> /about/, 404.html -> /404.html
export function urlPath(file) {
  const p = '/' + file.split(path.sep).join('/');
  return p.endsWith('/index.html') ? p.slice(0, -'index.html'.length) : p;
}

// Marks the menu link for the current section with aria-current="page".
function markCurrent(html, url) {
  return html.replace(/<a\b([^>]*?)href="([^"]+)"([^>]*)>/g, (tag, before, href, after) => {
    if (!/\bdata-nav\b/.test(before + after)) return tag;
    const current = href === '/' ? url === '/' : url.startsWith(href);
    return current ? `<a${before}href="${href}"${after} aria-current="page">` : tag;
  });
}

// Editable text and images live in content/ (edited in the admin at /admin).
// A page names its file with "content: <id>" (content/pages/<id>.json); the
// shared footer and closing band read content/site.json. In HTML,
// {{c:key.path}} inserts a value as HTML and {{a:key.path}} as an attribute.
async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

function lookup(obj, keyPath, where) {
  const value = keyPath.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  if (typeof value !== 'string') throw new Error(`${where}: no text for "${keyPath}" in content`);
  // Text from the admin may hold simple HTML (links, bold, line breaks), never scripts.
  if (/<\s*(script|iframe|object|embed|style|form)\b|\son\w+\s*=|javascript:/i.test(value)) {
    throw new Error(`${where}: "${keyPath}" contains a script, frame or event handler, which content may not hold`);
  }
  return value;
}

function fillContent(html, page, site, where) {
  return html.replace(/\{\{([ca]):([\w.]+)\}\}/g, (_, kind, keyPath) => {
    const [source, rest] = keyPath.startsWith('site.') ? [site, keyPath.slice(5)] : [page, keyPath];
    const value = lookup(source, rest, where);
    return kind === 'a' ? escapeAttr(value) : value;
  });
}

async function build() {
  const site = await readJson(path.join(root, 'content/site.json'));
  const layout = await readFile(path.join(src, 'layout.html'), 'utf8');
  const partials = {};
  for (const name of await readdir(path.join(src, 'partials'))) {
    partials[name.replace(/\.html$/, '')] = await readFile(path.join(src, 'partials', name), 'utf8');
  }

  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  await cp(path.join(src, 'assets'), path.join(out, 'assets'), { recursive: true });

  const pages = await listHtml(path.join(src, 'pages'));
  for (const file of pages) {
    const { meta, body } = parsePage(await readFile(path.join(src, 'pages', file), 'utf8'), file);
    const page = meta.content ? await readJson(path.join(root, 'content/pages', `${meta.content}.json`)) : {};
    meta.title = page.title || meta.title;
    meta.description = page.description || meta.description;
    for (const key of ['title', 'description']) {
      if (!meta[key]) throw new Error(`${file}: needs a ${key} (in its content file or front matter)`);
    }
    const url = urlPath(file);
    let html = layout.replace(/\{\{>\s*(\w+)\s*\}\}/g, (_, name) => {
      if (!(name in partials)) throw new Error(`layout: unknown partial "${name}"`);
      return partials[name];
    });
    // Partials can also be used inside a page body, e.g. {{> cta}}.
    const expand = (s) => s.replace(/\{\{>\s*(\w+)\s*\}\}/g, (_, name) => {
      if (!(name in partials)) throw new Error(`${file}: unknown partial "${name}"`);
      return partials[name];
    });
    const values = {
      title: escapeAttr(meta.title),
      description: escapeAttr(meta.description),
      canonical: meta.noindex ? '' : `<link rel="canonical" href="${SITE}${url}">`,
      robots: meta.noindex ? '<meta name="robots" content="noindex">' : '',
      ogurl: meta.noindex ? '' : `<meta property="og:url" content="${SITE}${url}">`,
      scripts: (meta.scripts ?? '').split(/\s+/).filter(Boolean).map((s) => `<script src="${escapeAttr(s)}" defer></script>`).join('\n'),
      year: String(new Date().getFullYear()),
      body: expand(body.trim()),
    };
    html = html.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
      if (!(key in values)) throw new Error(`layout: unknown value "${key}"`);
      return values[key];
    });
    html = fillContent(html, page, site, file);
    html = markCurrent(html, url).replace(/^\s*\n/gm, '');
    const dest = path.join(out, file);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, html);
  }
  // sitemap.xml and robots.txt, from every page that is not noindex.
  const urls = [];
  for (const file of pages) {
    const { meta } = parsePage(await readFile(path.join(src, 'pages', file), 'utf8'), file);
    if (!meta.noindex) urls.push(`${SITE}${urlPath(file)}`);
  }
  await writeFile(
    path.join(out, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`,
  );
  await writeFile(path.join(out, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ${SITE}/sitemap.xml\n`);

  // React islands: each src/react/<name>.jsx becomes /assets/js/<name>.react.js,
  // loaded only by the page that needs it (Work and Contact).
  const islands = (await readdir(path.join(src, 'react'))).filter((f) => f.endsWith('.jsx'));
  for (const file of islands) {
    await esbuild({
      entryPoints: [path.join(src, 'react', file)],
      outfile: path.join(out, 'assets/js', file.replace(/\.jsx$/, '.react.js')),
      bundle: true,
      minify: true,
      format: 'iife',
      target: 'es2020',
      jsx: 'automatic',
      define: { 'process.env.NODE_ENV': '"production"' },
      legalComments: 'none',
      logLevel: 'warning',
    });
  }
  // The admin at /admin (not a public page: no layout, kept out of search and the page checks).
  await buildAdmin(root, out);
  console.log(`Built ${pages.length} page(s), ${islands.length} React island(s) and the admin into dist/`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  build().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
