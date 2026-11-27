// Accessibility check: loads every built page in Chromium and runs axe-core
// against WCAG 2.0, 2.1 and 2.2 A/AA rules, at phone (390px), tablet (768px) and desktop (1440px)
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
  for (const width of [390, 768, 1440]) {
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

  // Phone menu: hidden behind a Menu button at 390px, opens and closes from
  // the keyboard, closes on Escape, and passes axe while open.
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(base + '/');
  const button = page.locator('.menu-button');
  const menu = page.locator('#site-menu');
  const check = (ok, msg) => { if (!ok) { failures++; console.error(`✗ ${msg}`); } };
  check(await button.isVisible(), 'Menu button not shown at 390px');
  check(!(await menu.isVisible()), 'menu should start closed at 390px');
  await button.focus();
  await page.keyboard.press('Enter');
  check((await button.getAttribute('aria-expanded')) === 'true' && (await menu.isVisible()), 'Enter does not open the menu');
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  for (const v of violations) check(false, `open menu: ${v.id} ${v.help}`);
  await page.keyboard.press('Escape');
  check((await button.getAttribute('aria-expanded')) === 'false' && !(await menu.isVisible()), 'Escape does not close the menu');
  check(await button.evaluate((el) => el === document.activeElement), 'focus not returned to the Menu button');
  await context.close();

  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const dpage = await desktop.newPage();
  await dpage.goto(base + '/');
  check(await dpage.locator('#site-menu').isVisible(), 'menu should be visible at 1440px');
  check(!(await dpage.locator('.menu-button').isVisible()), 'Menu button should be hidden at 1440px');
  await desktop.close();

  const nojs = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
  const npage = await nojs.newPage();
  await npage.goto(base + '/');
  check(await npage.locator('#site-menu').isVisible(), 'without JavaScript the menu should show in full');
  await nojs.close();
  if (!failures) console.log('✓ phone menu: keyboard, Escape, no-JS fallback');

  // Work filter (US-07): all case studies without JavaScript; with it, the
  // filter narrows the list, announces the count, and passes axe.
  const before = failures;
  const wnojs = await browser.newContext({ javaScriptEnabled: false });
  const wn = await wnojs.newPage();
  await wn.goto(base + '/work/');
  const all = await wn.locator('[data-case]').count();
  check(all >= 5, `without JavaScript the Work page shows ${all} case studies, expected all`);
  await wnojs.close();
  const wjs = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const wp = await wjs.newPage();
  await wp.goto(base + '/work/');
  const buttons = wp.locator('.filter-button');
  await buttons.first().waitFor();
  check((await wp.locator('[data-case]').count()) === all, 'filter "All" should show every case study');
  await buttons.nth(1).click();
  const one = await wp.locator('[data-case]').count();
  check(one >= 1 && one < all, `filtering by one industry shows ${one} of ${all}`);
  check((await buttons.nth(1).getAttribute('aria-pressed')) === 'true', 'pressed filter button needs aria-pressed="true"');
  check(/Showing \d+ of \d+/.test(await wp.locator('.filter-status').textContent()), 'filter status not announced');
  const wv = await new AxeBuilder({ page: wp }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  for (const v of wv.violations) check(false, `work filter: ${v.id} ${v.help}`);
  await wjs.close();
  if (failures === before) console.log('✓ work filter: no-JS list, filtering, aria-pressed, status');

  // Contact form (US-08): inline errors tied to fields, focus moves to the
  // first problem, and a successful send confirms on the page.
  const before2 = failures;
  const cctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const cp = await cctx.newPage();
  await cp.route('https://forms.test/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
  await cp.goto(base + '/contact/');
  await cp.locator('#cf-name').waitFor();
  await cp.locator('.demo-form button[type=submit]').click();
  check((await cp.evaluate(() => document.activeElement?.id)) === 'cf-name', 'empty submit should focus the first invalid field');
  check((await cp.locator('#cf-name').getAttribute('aria-describedby')) === 'cf-name-error', 'error message not linked to its field');
  const ce = await new AxeBuilder({ page: cp }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  for (const v of ce.violations) check(false, `contact form with errors: ${v.id} ${v.help}`);
  await cp.locator('#cf-email').fill('not-an-email');
  await cp.locator('#cf-email').blur();
  check(/name@company\.com/.test(await cp.locator('#cf-email-error').textContent()), 'bad email not explained');
  // Point the form at a fake service and send a valid request.
  await cp.evaluate(() => { document.getElementById('contact-form').dataset.endpoint = 'https://forms.test/f'; });
  await cp.locator('#cf-name').fill('Test Person');
  await cp.locator('#cf-email').fill('test@example.com');
  await cp.locator('#cf-company').fill('Example Pte Ltd');
  await cp.locator('#cf-country').selectOption('Singapore');
  await cp.locator('#cf-message').fill('We would like to see the Janitor Robot.');
  await cp.locator('.demo-form button[type=submit]').click();
  await cp.locator('.form-done').waitFor({ timeout: 5000 }).catch(() => {});
  check(await cp.locator('.form-done').isVisible(), 'a successful send should confirm on the page');
  check((await cp.evaluate(() => document.activeElement?.className)) === 'form-done', 'focus should move to the confirmation');
  await cctx.close();
  // With no endpoint configured, the form must say so rather than claim success.
  const c2 = await browser.newContext();
  const p2 = await c2.newPage();
  await p2.goto(base + '/contact/');
  await p2.locator('#cf-name').waitFor();
  await p2.locator('#cf-name').fill('Test Person');
  await p2.locator('#cf-email').fill('test@example.com');
  await p2.locator('#cf-company').fill('Example Pte Ltd');
  await p2.locator('#cf-country').selectOption('Singapore');
  await p2.locator('#cf-message').fill('We would like to see the Janitor Robot.');
  await p2.locator('.demo-form button[type=submit]').click();
  check(/not connected yet/.test(await p2.locator('.form-error').textContent()), 'unconnected form should tell visitors to email');
  check((await p2.locator('.form-done').count()) === 0, 'unconnected form must not show a success message');
  await c2.close();
  if (failures === before2) console.log('✓ contact form: inline errors, focus, no false success');
} finally {
  await browser.close();
  server.kill();
}
process.exit(failures ? 1 : 0);
