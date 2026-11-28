// Admin (Sveltia CMS, a Git-based CMS) for editing the text and images in content/.
// The build copies the CMS into dist/admin/ and writes dist/admin/config.yml
// from the content files, so every page gets a form with one field per text
// or image. Saving in the admin commits the change to GitHub; the usual checks
// then run on it. Nothing here runs on the public pages.
import { readFile, writeFile, mkdir, copyFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const REPO = 'rmurali79/alai-website';

const LABELS = {
  h1: 'Main heading', h2: 'Heading', h3: 'Subheading', h4: 'Small heading',
  p: 'Paragraph', li: 'List item', th: 'Row label', td: 'Row value',
  caption: 'Image caption', tcaption: 'Table caption', dt: 'Term', dd: 'Description',
  address: 'Address', quote: 'Quote', img: 'Image',
};
const SHORT = new Set(['h1', 'h2', 'h3', 'h4', 'th', 'dt']);
const HTML_HINT = 'Contains a link or formatting written as HTML. Change the words and keep the <…> tags as they are.';

// "What Alai does here" for a section, taken from its first heading.
function sectionLabel(name, section) {
  if (name === 'head') return 'Page header';
  if (name === 'footer') return 'Footer';
  const heading = Object.entries(section).find(([k, v]) => /^h[1-3]_/.test(k) && typeof v === 'string');
  const text = heading ? heading[1].replace(/<[^>]+>/g, '').trim() : name.replace(/_/g, ' ');
  return `Section: ${text}`;
}

function fieldFor(key, value, counts) {
  const [, type, n] = key.match(/^([a-z]+?\d?)_(\d+)$/) || [null, key, ''];
  const label = `${LABELS[type] ?? key}${counts[type] > 1 ? ` ${n}` : ''}`;
  if (type === 'img') {
    return {
      name: key, label, widget: 'object',
      fields: [
        { name: 'src', label: 'Image file', widget: 'image', hint: 'WebP or JPEG, about 1000 px wide and under 300 KB.' },
        { name: 'alt', label: 'Description for screen readers', widget: 'string', required: false, hint: 'Say what the image shows. Leave empty only if it is decoration.' },
      ],
    };
  }
  const field = { name: key, label, widget: SHORT.has(type) ? 'string' : 'text' };
  if (value.includes('<')) field.hint = HTML_HINT;
  return field;
}

function fieldsFor(obj) {
  const fields = [];
  for (const [name, value] of Object.entries(obj)) {
    if (name === 'title') fields.push({ name, label: 'Browser tab title', widget: 'string', hint: 'Shown in the browser tab and search results. Keep it unique.' });
    else if (name === 'description') fields.push({ name, label: 'Search description', widget: 'text', hint: 'One or two sentences shown in search results. Keep it unique.' });
    else if (value && typeof value === 'object') {
      const counts = {};
      for (const k of Object.keys(value)) { const t = k.replace(/_\d+$/, ''); counts[t] = (counts[t] || 0) + 1; }
      fields.push({
        name, label: sectionLabel(name, value), widget: 'object', collapsed: false,
        fields: Object.entries(value).map(([k, v]) => fieldFor(k, v, counts)),
      });
    }
  }
  return fields;
}

const GROUPS = [
  ['main', 'Main pages', (id) => !id.includes('/') && !['solutions', 'products', 'work'].includes(id)],
  ['solutions', 'Solutions', (id) => id === 'solutions' || id.startsWith('solutions/')],
  ['products', 'Products', (id) => id === 'products' || id.startsWith('products/')],
  ['work', 'Work and case studies', (id) => id === 'work' || id.startsWith('work/')],
];

async function listJson(dir, base = dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await listJson(full, base)));
    else if (e.name.endsWith('.json')) out.push(path.relative(base, full).split(path.sep).join('/').replace(/\.json$/, ''));
  }
  return out.sort();
}

export async function buildAdmin(root, out) {
  const contentDir = path.join(root, 'content');
  const ids = await listJson(path.join(contentDir, 'pages'));
  const pageEntry = async (id) => {
    const data = JSON.parse(await readFile(path.join(contentDir, 'pages', `${id}.json`), 'utf8'));
    const label = (data.head?.h1_1 ?? data.title ?? id).replace(/<[^>]+>/g, '');
    return { name: id.replace(/\W/g, '_'), label, file: `content/pages/${id}.json`, fields: fieldsFor(data) };
  };
  const collections = [{
    name: 'site', label: 'Every page', description: 'The footer and the closing "Request a demo" band shown on every page.',
    editor: { preview: false },
    files: [{ name: 'site', label: 'Footer and closing band', file: 'content/site.json', fields: fieldsFor(JSON.parse(await readFile(path.join(contentDir, 'site.json'), 'utf8'))) }],
  }];
  for (const [name, label, test] of GROUPS) {
    const files = await Promise.all(ids.filter(test).map(pageEntry));
    if (files.length) collections.push({ name, label, files, editor: { preview: false } });
  }
  const config = {
    backend: { name: 'github', repo: REPO, branch: 'main', commit_messages: { update: 'Admin: update {{collection}} “{{slug}}”' } },
    site_url: 'https://alai-labs.com',
    media_folder: 'src/assets/img/uploads',
    public_folder: '/assets/img/uploads',
    collections,
  };
  const adminOut = path.join(out, 'admin');
  await mkdir(adminOut, { recursive: true });
  // JSON is valid YAML, so the CMS reads this file as its config.yml.
  await writeFile(path.join(adminOut, 'config.yml'), JSON.stringify(config, null, 2) + '\n');
  await copyFile(path.join(root, 'node_modules/@sveltia/cms/dist/sveltia-cms.js'), path.join(adminOut, 'sveltia-cms.js'));
  await copyFile(path.join(root, 'src/admin/index.html'), path.join(adminOut, 'index.html'));
  return { pages: ids.length };
}
