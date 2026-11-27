# U1 design directions

Two static home page mock-ups for the Alai team to choose from (the U1 gate in `docs/aidlc/construction/plan.md`). They are not part of the built site.

- `index.html`: side-by-side comparison, with screenshots, colours and type.
- `a/`: direction A, Clear and technical (IBM Plex Sans, white with hairline rules, plum for actions).
- `b/`: direction B, Warm and confident (Source Serif 4 and Source Sans 3, deep plum cover, white and stone).
- `assets/`: client logos and product images taken from the current alai-labs.com, trimmed and converted to WebP; self-hosted fonts from Fontsource (SIL Open Font License).

Preview: `python3 -m http.server -d design/u1 8090`, then open http://localhost:8090.

Once a direction is chosen, U2 turns it into the real layout, base styles and tokens in `src/`, and this folder can be deleted.
