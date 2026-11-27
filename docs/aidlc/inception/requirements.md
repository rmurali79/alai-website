# Inception requirements

Status: answered by Muralidharan on 27 Nov 2026. The living, commentable version is the [Claude Doc](https://claude.ai/artifact/H2kh9ky6xGfV7BS21CQUW6); this file is the copy the build works from. Source research: [content map](https://claude.ai/artifact/RbBm55NMQW5b33TGUShJNC).

## Positioning

> Alai Labs builds robots, edge AI and industrial IoT that keep ports, public services, facilities and factories running, with less manual work and less downtime.

Kept as the working line; it may change later. Tone: plain, specific, calm. Name the client, the problem and the result.

Success means:

- A first-time visitor can say what Alai does from the home page's first screen.
- Every capability claim links to a product, case study or client logo that backs it.
- Nothing moves unless the visitor asks it to.
- Enquiries come through one action: **Request a demo**.
- Every page has its own title and description.

## Audiences

Markets: Singapore, the US and India.

| Audience | Example | Needs to see first | Goes to |
| --- | --- | --- | --- |
| Operations leaders | Port, facilities or fleet heads (PSA, SMRT, IFM firms) | Their industry, a similar deployment, a result | Solutions page, then a case study |
| Public sector buyers | NEA, CPIB, NHB, SUTD | Public-sector clients, data security, local team | Logos, Work, About |
| Engineering and procurement evaluators | Engineers checking a shortlist | Specs, edge hardware sizing, integration | Products, How we work |
| Partners, hires, investors | Integrators, candidates | Leadership, offices, what Alai has built | About, Contact |

## User stories

| ID | As a... | I want to... | Acceptance criteria |
| --- | --- | --- | --- |
| US-01 | First-time visitor | Read one sentence on what Alai does and for whom | Positioning line and primary CTA on first screen at 390 px and 1440 px; no animation before it shows |
| US-02 | Operations leader | See which organisations use Alai | All 17 client logos directly under the hero; each links to a case study where one exists |
| US-03 | Operations leader | Find my industry | One Solutions page per industry, one click from the menu, linking to related products and case studies |
| US-04 | Buyer | Read a case study with a result | Client, problem, deployment, measurable result, photo; 5 at launch (results may be placeholders until supplied) |
| US-05 | Evaluator | See a product's specs and deployments | Photos or video, spec table, deployments, CTA on each product page |
| US-06 | Evaluator | Understand how Alai deploys edge AI | How we work covers edge server sizing, IIoT, remote ops in plain steps |
| US-07 | Visitor | Filter case studies by industry | React filter on Work; without JavaScript all case studies show |
| US-08 | Prospect | Request a demo and know what happens next | Form validates inline, confirms on the page, states response time; email, phone, LinkedIn listed |
| US-09 | Partner or hire | See who leads Alai | About page with leadership, story, three offices |
| US-10 | Motion-sensitive visitor | Read without anything moving | Motion budget met; transitions off under prefers-reduced-motion |
| US-11 | Keyboard or screen reader user | Use every page | WCAG 2.2 AA: visible focus, alt text, one H1 per page, 4.5:1 body contrast |
| US-12 | Searcher | See a clear search result | Unique title and meta description per page; old spam URLs return 410 at launch |

## Pages

| Page | Key content | Stories | React |
| --- | --- | --- | --- |
| Home | Positioning, Request a demo, 17 logos, 3 featured case studies | US-01, 02 | No |
| Solutions (index + 7) | Ports, public cleaning, facility management, waste, manufacturing, infrastructure monitoring, occupancy | US-03 | No |
| Products (index + 3) | Janitor Robot, SensZ.AI, Outdoor Cleaning Arm: photos, video on click, specs, deployments | US-05 | No |
| Work (index + 5) | Case studies in order: NEA, CTM, PSA, SMRT, Sodick | US-04, 07 | Filter on index |
| How we work | Edge AI method, edge server sizing, IIoT, remote ops and digital twins | US-06 | No |
| About | Dr. Nagaraj Lakshmana Prabhu (CEO), Viswanathan T K (Head of Engineering), story, Singapore, US and India offices | US-09 | No |
| Contact | Request a demo form, email, phone, LinkedIn, offices | US-08 | Form |
| Privacy, 404 | Form privacy notice, helpful 404 | US-12 | No |

Menu: Solutions, Products, Work, How we work, About, and a Request a demo button. Retail is dropped (no content).

## Motion budget

| Keep | Drop |
| --- | --- |
| Native scrolling | Intro loader, globe video |
| Hover and focus feedback, 150 to 200 ms | Rotating or typed headlines |
| One static hero with the full line and CTA | Scroll smoothing, pinned sections, scroll-driven sliders |
| Product video on product pages, poster image, plays on click | Fade-up on every block |
| Everything off under prefers-reduced-motion | Background colour switches (one light theme) |
| | Autoplay sliders and marquees (use grids) |

No jQuery, GSAP, Lenis, AOS or Swiper. New motion needs a user story and must pass the reduced-motion check.

## Technical and quality requirements

| Area | Requirement |
| --- | --- |
| Stack | Static HTML and CSS; React only for the Work filter and Contact form, loaded on those pages only. No WordPress, no DB migration. |
| Content | Old site is a source only; copy is rewritten. |
| Accessibility | WCAG 2.2 AA. |
| Performance | Under 2 s on a mid-range phone on 4G; Lighthouse performance 90+. Modern image formats with set sizes. |
| Responsive | 390 px first; checked at 768 and 1440 px; no horizontal scroll. |
| SEO | Title and description per page, sitemap.xml, Organization structured data. |
| Hosting | Static hosting on Hetzner (moving from AWS), HTTPS, no admin login, form posts to a managed service with spam protection. |
| Cutover | ~450 spam URLs return 410; old anchors redirect; spam removed in Search Console. |
| Analytics | None for now. |
| Brand | Refresh welcome: logo, colours and fonts may change. |

## Still to come from the Alai team

- Measurable results for the five case studies (placeholders until then).
- Leadership photos and bios.
- Who receives demo requests and the reply time; phone and LinkedIn.
- Product specs; better photos and clips later (existing photos used at launch).
- Clean-up of the compromised WordPress site (Muralidharan to request).
