// Accessibility check: loads every built page in Chromium and runs axe-core
// against WCAG 2.0, 2.1 and 2.2 A/AA rules, at phone (390px) and desktop (1440px)
// widths, with reduced motion requested. Any violation fails the run.
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const port = 4173;
const base = `http://localhost:${port}`;

async function pages(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await pages(full)));
    else if (e.name.endsWith('.html')) {
      const p = '/' + path.relative(dist, full).split(path.sep).join('/');
      out.push(p.endsWith('/index.html') ? p.slice(0, -10) : p);
    }
  }
  return out.sort();
}

const server = spawn(process.execPath, [path.join(root, 'scripts/serve.mjs')], {
  env: { ...process.env, PORT: String(port) },
  stdio: 'ignore',
});
await new Promise((r) => setTimeout(r, 500));

let failures = 0;
const browser = await chromium.launch();
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    for (const url of await pages(dist)) {
      await page.goto(base + url);
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      const scrolls = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      if (scrolls) {
        failures++;
        console.error(`✗ ${url} @${width}px: page scrolls sideways`);
      }
      for (const v of violations) {
        failures++;
        console.error(`✗ ${url} @${width}px: ${v.id} (${v.impact}) ${v.help}\n    ${v.nodes.map((n) => n.target.join(' ')).join('\n    ')}`);
      }
      if (!violations.length && !scrolls) console.log(`✓ ${url} @${width}px`);
    }
    await context.close();
  }
} finally {
  await browser.close();
  server.kill();
}
process.exit(failures ? 1 : 0);
