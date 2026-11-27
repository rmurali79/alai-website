# Construction plan

Construction turns the [requirements](../inception/requirements.md) into the site, one unit at a time. Each unit is one pull request that names the stories it meets and how they were checked. The Alai team approves the design direction (U1) before page work starts.

| Unit | What it delivers | Stories | Gate |
| --- | --- | --- | --- |
| U0 | Repo foundation: folder layout, shared header/footer approach, local preview, CI checks (HTML validity, links, accessibility, Lighthouse) | US-10, 11 | PR review |
| U1 | Design direction: type, colour, spacing, logo treatment; a static Home mock-up in two directions | US-01 | **Alai team picks a direction** |
| U2 | Layout shell: header, menu, footer, base styles, focus states, reduced-motion rules | US-10, 11 | PR review |
| U3 | Home page | US-01, 02 | PR review |
| U4 | Solutions index and 7 industry pages | US-03 | PR review |
| U5 | Products index and 3 product pages | US-05 | PR review |
| U6 | Work index with React filter, 5 case studies (NEA, CTM, PSA, SMRT, Sodick) | US-04, 07 | PR review |
| U7 | How we work | US-06 | PR review |
| U8 | About | US-09 | PR review |
| U9 | Contact with React Request a demo form and form service | US-08 | PR review |
| U10 | Privacy, 404, sitemap, per-page meta, structured data | US-12 | PR review |
| U11 | Full QA pass at 390, 768 and 1440 px; preview link for sign-off | All | **Alai team signs off** |

Content still missing (results, bios, specs) is marked with a visible placeholder so pages can ship for review and be filled later.

## Operations (after U11)

| Step | What happens |
| --- | --- |
| O1 | Set up static hosting on Hetzner with HTTPS |
| O2 | Redirect old anchor links; return 410 for the spam URLs |
| O3 | Move DNS from AWS to the new host (Alai team approves go-live) |
| O4 | Submit sitemap and remove spam URLs in Google Search Console |

## Decision for U0

Shared header and footer across about 20 pages: either copy them into each HTML file, or use a tiny build script that stamps them in and outputs plain HTML. Recommended: the build script, because it keeps the menu in one place while the published site stays plain HTML.
