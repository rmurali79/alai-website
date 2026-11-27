# alai-website

New alai-labs.com, built with AIDLC (Inception, Construction, Operations).

- Requirements: `docs/aidlc/inception/requirements.md`. Construction units: `docs/aidlc/construction/plan.md`.
- Stack: plain HTML and CSS. React only for the Work filter and the Contact form, loaded only on those pages.
- Motion budget is a hard rule: native scrolling, hover/focus feedback only, nothing autoplays, everything off under `prefers-reduced-motion`. No jQuery, GSAP, Lenis, AOS, Swiper.
- WCAG 2.2 AA, one H1 per page, unique title and description per page.
- One unit per PR; the PR names the user stories (US-xx) it meets and how they were checked.
- Missing content gets a visible placeholder, never invented facts or numbers.
