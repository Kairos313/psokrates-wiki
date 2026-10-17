# Stoa design system

The wiki uses one visual language, **Stoa**: a sunlit Greek portico in marble and gold, which suits a project told through Socrates, Hippocrates and Plato. Use this guide whenever you add or change a page so the site stays consistent.

## Files

| File | What it does |
|---|---|
| `static/stoa/stoa.css` | Tokens, nav polish, portico header, reading layout and contents list, pager, back-to-top, homepage walk styles |
| `static/stoa/stoa-skin.css` | Brings the custom pages (Home story, Description, Education, Engineering, Human Practices, Members, footer, page transition) onto the system. CSS only. |
| `static/stoa/stoa.js` | Active menu link, reading layout and contents list, scroll-spy, progress bar, back-to-top, and lazy-loading of the 3D scenes |
| `static/stoa/stoa-walk.js` | Home: the 3D colonnade walk |
| `static/stoa/stoa-cave.js` | Education: Plato's Cave (fire, puppet shadows, walk out into daylight) |
| `static/stoa/stoa-tholos.js` | Engineering: the round temple that turns through the cycle |
| `wiki/stoa/_nav_data.html` | Page order and section labels for the header kicker and the Previous/Next pager |

## Tokens

Use the CSS variables, not raw hex values.

| Token | Value | Use |
|---|---|---|
| `--stoa-parch` | `#fdf9f3` | Page background |
| `--stoa-parch-2` | `#f3ead9` | Lower parchment, footer |
| `--stoa-ink` | `#1a1208` | Titles, body text |
| `--stoa-muted` | `#6f604c` | Secondary text, captions |
| `--stoa-gold` | `#c5a059` | Rules, borders, numerals |
| `--stoa-gold-dk` | `#9c7a3c` | Labels, links, second highlight |
| `--stoa-accent` | `#d9882b` | Main highlight, active states |

**Highlighting words:** use only two tones, `--stoa-accent` and `--stoa-gold-dk`.

**Graded scales:** use dark to light (`#1a1208 → #5a4e3e → #8a7355 → #c5a059 → #d9882b`). The education stages use this scale: cave to light.

## Type

| Role | Font | Notes |
|---|---|---|
| Display (page titles, section headings, numerals) | `var(--stoa-display)`, Fredericka the Great | Ink colour. Never for body text. |
| Body | `var(--stoa-serif)`, IBM Plex Serif | 17px, line-height 1.75 in reading pages |
| Labels (kickers, captions, buttons, nav cues) | `var(--stoa-sans)`, Inter | 11–13px, uppercase, letter-spacing .2–.3em, `--stoa-gold-dk` |

## Components

- **Portico header.** Comes automatically on any page that keeps the default `site_header` block. It shows the section numeral and label, the title and the `lead` block.
- **Reading layout.** Comes automatically on portico pages. Every `<h2>` becomes an entry in the sticky "On this page" list. To get a good list, write clear `<h2>` section headings.
- **Plaque surface.** Cards use the marble gradient `linear-gradient(160deg, #fffdf8, #f4ecdd)`, a 1px gold border, a soft inset highlight and a 4px radius. See `stoa-skin.css` for the shared rule.
- **Ornaments.** Use only the team's DNA-strand border (`upper/lower-frame-for-scene.avif`), drawn pillars and clouds, and gold hairlines. Don't add other decorative styles.
- **Pager.** Previous and Next links follow the order in `wiki/stoa/_nav_data.html`. Add any new page there.

## 3D scenes

- Scenes load only on pages that need them. `stoa.js` checks for a selector (`.edu-hero`, `.eng-hero`) and then loads `static/vendor/three.min.js` and the scene script.
- Every scene:
  - renders only while it's on screen
  - caps the pixel ratio and turns shadows off on touch devices
  - shows one still frame under `prefers-reduced-motion`
  - leaves the page untouched when WebGL is unavailable.
- To add a scene, append `{ test: ".your-selector", script: "stoa/your-scene.js" }` to the `scenes` list in `stoa.js`.

## Rules

- Write content in the page files. Style it through these classes and tokens, not inline colours or fonts.
- Keep every image on `static.igem.wiki` and use no external CDNs (iGEM rules).
- Every page must keep the footer's licence text and GitLab link.
