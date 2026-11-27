# U11 QA pass and sign-off

Full QA pass of the site after U0 to U10, at phone (390 px), tablet (768 px) and desktop (1440 px). This is the approval gate before Operations: **the Alai team signs off**.

Preview for review: https://claude.ai/artifact/7McqiEuGv9xXbnKUUrzoFE (a private page until it is shared; built with `npm run preview`). The contact form there cannot send. That is expected until a form service is chosen.

## What was checked (27 Nov 2026)

| Area | Result | How |
| --- | --- | --- |
| Accessibility (WCAG 2.2 AA) | 0 axe violations on all 24 pages (including 404) at 390, 768 and 1440 px, with reduced motion requested | `npm run check:a11y` |
| No sideways scrolling | None at any of the three widths | `npm run check:a11y` |
| Keyboard and no-JavaScript | Phone menu opens from the keyboard and closes on Escape, and the full menu shows without JavaScript. The Work list shows without JavaScript and filters with it. Contact form errors are linked to their fields and focus moves to them | `npm run check:a11y` |
| Site rules | One H1 per page, unique titles and descriptions, no autoplay, no banned motion libraries, reduced-motion rule present, React only on Work and Contact, valid structured data, every page in the sitemap | `npm run check:pages` |
| HTML | Valid on every page | `npm run check:html` |
| Links | Every internal link, image and anchor resolves | `npm run check:links` |
| Lighthouse (24 URLs, 2 runs each) | Lowest scores: performance 94, accessibility 100, best practices 96, SEO 100 (404 page excluded from SEO) | `npm run check:lighthouse` |
| Visual review | Full-page screenshots of every page at all three widths. Tablet got the closest look, since phone and desktop were reviewed unit by unit | Playwright screenshots |

## Fixed in this pass

- At tablet width (601 to 860 px), product, industry and capability cards were stacked one per row, which made pages long and images very large. They now sit two per row, and go to one per row below 601 px.
- The accessibility check now also runs at 768 px, so tablet layouts stay covered.

## Waiting on the Alai team

These show as visible placeholders on the site. None of them block a review, but the site should not go live with the starred ones still empty.

- \* Form service, who receives demo requests, and the reply time
- \* Legal review of the privacy notice
- \* Phone number and LinkedIn page
- Client-to-industry mapping for the five case studies (currently marked "to confirm"), and which products are used in each industry
- Case study content: the problem, what was deployed, measured results and photos
- Product specifications (dimensions, battery and run time, cleaning functions and others), deployments, photos and clips
- Leadership photos and short bios, the company story, partners and careers
- Data security and support details
- A share image for social cards

## Sign-off

- [ ] Alai team approves the site for Operations (O1 to O4 in `plan.md`)
