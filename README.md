# alai-website

Source for the new [alai-labs.com](https://alai-labs.com): a calm, clear site that explains what Alai Labs does, shows the work, and builds client trust.

Built with an AI-driven development lifecycle (AIDLC). Plain HTML and CSS, with React only where a page needs it. Requirements are in [`docs/aidlc/inception/requirements.md`](docs/aidlc/inception/requirements.md), the build plan in [`docs/aidlc/construction/plan.md`](docs/aidlc/construction/plan.md), and the build rules in [`CLAUDE.md`](CLAUDE.md).

## Work on the site

Needs Node 20 or later.

```sh
npm install
npm run dev        # build, then preview at http://localhost:8080
npm run check      # build and run every check except Lighthouse
```

`npm run dev` does not watch files: run it again after a change.

## How it fits together

```
src/
  layout.html        the page shell: <head>, skip link, header, main, footer
  partials/          header.html and footer.html, shared by every page
  pages/             one file per page; the path is the URL
  assets/            copied as they are:
    css/site.css     design tokens (colours, type, spacing) and all shared styles
    fonts/           Source Serif 4 and Source Sans 3, self-hosted (OFL)
    js/menu.js       the phone menu button; without JavaScript the menu shows in full
scripts/
  build.mjs          stamps layout and partials into each page, writes dist/
  serve.mjs          local preview of dist/
  check-pages.mjs    site rules: one H1, unique title and description, motion budget
  check-links.mjs    every internal link and image points at a real file
tests/a11y.mjs       axe accessibility check at 390 and 1440 px
dist/                the built site (plain HTML, not committed)
```

A page is HTML with a short header:

```html
---
title: Ports | Alai Labs
description: One sentence, unique to this page.
---
<section class="page-head">
  <div class="wrap">
    <h1>Ports</h1>
    <p class="lede">One or two sentences under the title.</p>
  </div>
</section>
<section class="band">
  <div class="wrap">...</div>
</section>
```

Every page opens with the plum `page-head` band. Below it, use `band` sections (add `band-stone` for the stone background), `grid-2` or `grid-3` for columns, `card` with `card-body` for cards, and `button`, `button-quiet`, or `button-on-dark` for actions. The look is design direction B, Warm and confident, chosen in U1.

`src/pages/solutions/ports/index.html` is served at `/solutions/ports/`. Add `noindex: true` to keep a page out of search results. A menu link marked `data-nav` gets `aria-current="page"` on the pages it covers.

Content the Alai team has not supplied yet goes in a visible `<p class="placeholder">`, never an invented fact.

## Checks

Every pull request runs these in GitHub Actions; a failure blocks the merge.

| Check | Command | What fails it |
| --- | --- | --- |
| Site rules | `npm run check:pages` | Not exactly one H1, a repeated or missing title or description, autoplay media, a banned motion library, no reduced-motion rule, React outside Work and Contact |
| HTML validity | `npm run check:html` | Invalid HTML ([html-validate](https://html-validate.org), recommended and a11y rules) |
| Internal links | `npm run check:links` | A link, image or `#anchor` that points nowhere |
| Accessibility | `npm run check:a11y` | Any axe WCAG 2.2 A/AA violation, or sideways scrolling, at 390 or 1440 px; a phone menu that doesn't open from the keyboard, close on Escape, or show without JavaScript |
| Lighthouse | `npm run check:lighthouse` | On every page (2 runs each): performance or best practices under 90, accessibility under 95, SEO under 90 (404 page excluded from SEO) |

To run Lighthouse locally, point it at a Chrome: `CHROME_PATH=/path/to/chrome npm run check:lighthouse`.
