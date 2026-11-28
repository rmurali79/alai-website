# alai-website

Source for the new [alai-labs.com](https://alai-labs.com): a calm, clear site that explains what Alai Labs does, shows the work, and builds client trust.

Built with an AI-driven development lifecycle (AIDLC). Plain HTML and CSS, with React only where a page needs it. Requirements are in [`docs/aidlc/inception/requirements.md`](docs/aidlc/inception/requirements.md), the build plan in [`docs/aidlc/construction/plan.md`](docs/aidlc/construction/plan.md), and the build rules in [`CLAUDE.md`](CLAUDE.md).

## Work on the site

Needs Node 20 or later.

```sh
npm install
npm run dev        # build, then preview at http://localhost:8080
npm run check      # build and run every check except Lighthouse
npm run preview    # copy of the site in preview/ with relative links, for review links
```

`npm run dev` does not watch files: run it again after a change.

## How it fits together

```
src/
  layout.html        the page shell: <head>, skip link, header, main, footer
  partials/          header, footer and the closing band, shared by every page
  pages/             one file per page; the path is the URL
  admin/index.html   the admin page (Sveltia CMS)
  react/             React islands: work-filter.jsx becomes /assets/js/work-filter.react.js
  assets/            copied as they are:
    css/site.css     design tokens (colours, type, spacing) and all shared styles
    fonts/           Space Grotesk and Manrope, self-hosted (OFL)
    js/menu.js       the phone menu button; without JavaScript the menu shows in full
content/
  site.json          text and images in the footer and closing band
  pages/<page>.json  text and images of each page (edited in the admin)
scripts/
  cms.mjs            builds the admin's form for every content file (dist/admin/config.yml)
  build.mjs          stamps layout and partials into each page, bundles React islands with esbuild,
                     writes sitemap.xml and robots.txt, and outputs dist/
  serve.mjs          local preview of dist/
  check-pages.mjs    site rules: one H1, unique title and description, motion budget
  check-links.mjs    every internal link and image points at a real file
  preview.mjs        review copy with relative links (preview/)
tests/a11y.mjs       axe accessibility check at 390, 768 and 1440 px
dist/                the built site (plain HTML, not committed)
```

A page is HTML with a short header naming its content file. Its words and images are placeholders filled from that file:

```html
---
content: solutions/ports
---
<section class="page-head">
  <div class="wrap">
    <h1>{{c:head.h1_1}}</h1>
    <p class="lede">{{c:head.p_1}}</p>
  </div>
</section>
```

`{{c:key}}` inserts text (simple HTML such as links is allowed) and `{{a:key}}` inserts an attribute value, such as an image's `src` or `alt`. Keys are `section.field`, read from `content/pages/solutions/ports.json`, which also holds the page's `title` and `description`. `{{c:site.…}}` reads `content/site.json`. To add text to a page, add the key to its content file and the placeholder to the HTML; the admin picks up new keys on the next build. The build stops if a placeholder has no text, or if any text holds a script, frame or event handler.

Every page opens with the navy `page-head` band. Below it, use `band` sections (add `band-stone` for the stone background), `grid-2` or `grid-3` for columns, `card` with `card-body` for cards, and `button`, `button-quiet`, or `button-on-dark` for actions. The look is design direction B from U1, in the Alai logo colours.

`src/pages/solutions/ports/index.html` is served at `/solutions/ports/`. Add `noindex: true` to keep a page out of search results, and `scripts: /assets/js/name.react.js` to load a React island on that page only (React is allowed only on Work and Contact; the site-rules check enforces it). Use `{{> cta}}` in a page body for the closing Request a demo band. A menu link marked `data-nav` gets `aria-current="page"` on the pages it covers.

**Request a demo form:** the form service endpoint is one setting, in `src/pages/contact/index.html`: put the URL in `data-endpoint` on `#contact-form` and in the form's `action`, and the reply time in `data-reply-time`. Until it is set, the form tells visitors to email info@alai-labs.com and never shows a false success.

Content the Alai team has not supplied yet goes in a visible `<p class="placeholder">`, never an invented fact.

## Editing text and images (admin)

The admin is at `/admin/` on the live site. It is a Git-based CMS (Sveltia CMS), so there is no server or database: each save is a commit to `main` on GitHub, and the checks below run on it.

- **Who can edit:** anyone with write access to this repository.
- **Signing in:** choose "Sign In Using Access Token" and paste a GitHub fine-grained personal access token. Create it at GitHub, Settings, Developer settings, Fine-grained tokens, for this repository only, with "Contents: Read and write". "Sign In with GitHub" also needs a small OAuth helper service, which is not set up.
- **On your own computer:** run `npm run dev`, open `http://localhost:8080/admin/`, choose "Work with Local Repository" and pick this folder (Chrome or Edge). Changes are written to the files directly, for you to commit.
- **Images:** uploads go to `src/assets/img/uploads/`. Use WebP or JPEG, about 1000 px wide and under 300 KB, and always describe the image for screen readers unless it is decoration.
- **Text with links:** some fields show HTML such as `<a href="/work/">See all our work</a>`. Change the words, keep the tags.

## Hosting

The site runs on a Hetzner Cloud server with Caddy, which handles HTTPS. After the checks pass on `main`, GitHub publishes `dist/` there (`.github/workflows/deploy.yml`). Server setup and go-live steps: `docs/operations/hetzner.md`. The web server config is `deploy/Caddyfile`; after changing it, run `npm run deploy:cloud-init`.

## Checks

Every pull request runs these in GitHub Actions; a failure blocks the merge.

| Check | Command | What fails it |
| --- | --- | --- |
| Site rules | `npm run check:pages` | Not exactly one H1, a repeated or missing title or description, autoplay media, a banned motion library, no reduced-motion rule, React outside Work and Contact, invalid structured data, an indexable page missing from the sitemap |
| HTML validity | `npm run check:html` | Invalid HTML ([html-validate](https://html-validate.org), recommended and a11y rules) |
| Internal links | `npm run check:links` | A link, image or `#anchor` that points nowhere |
| Accessibility | `npm run check:a11y` | Any axe WCAG 2.2 A/AA violation, or sideways scrolling, at 390, 768 or 1440 px; a phone menu that doesn't open from the keyboard, close on Escape, or show without JavaScript |
| Lighthouse | `npm run check:lighthouse` | On every page (2 runs each): performance or best practices under 90, accessibility under 95, SEO under 90 (404 page excluded from SEO) |

To run Lighthouse locally, point it at a Chrome: `CHROME_PATH=/path/to/chrome npm run check:lighthouse`.
