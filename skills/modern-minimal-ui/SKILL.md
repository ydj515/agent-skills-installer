---
name: modern-minimal-ui
description: Apply a Linear/Vercel-style modern minimal UI (indigo+violet accent on slate, rounded cards, gradient progress, step timeline, card grid) to any web project — Bootstrap 5, Tailwind, or vanilla HTML/CSS. Includes a responsive app shell with mobile hamburger drawer, light/dark theme toggle, and accessible four-state file dropzone. Use this skill whenever a web UI looks too generic ("looks like default Bootstrap", "needs polish", "make it modern/minimal"), when adding a progress page or result/output gallery, when building an upload form with drag-and-drop, when setting up theme switching or app layout, when laying out a new page that needs sidebar/topbar + responsive mobile menu, or any time the user asks for "Linear/Vercel/Stripe-style" design. Vanilla JS only — never use jQuery.
---

# Modern Minimal UI

A reusable design system inspired by Linear and Vercel: indigo→violet accent on a slate base, generous corner radii, subtle gradient surfaces, and a small set of well-defined components that compose into clean tool UIs.

## When this skill activates

Apply this skill when the user is working on a web frontend and any of the following are true:
- They describe the current UI as "default Bootstrap", "too plain", "generic", or "needs polish"
- They name-drop Linear, Vercel, Stripe, Notion, or "modern minimal" as a target aesthetic
- They're building a page with: upload form + dropzone, progress timeline, result listings, dashboard cards, or onboarding/wizard steps
- They mention dark mode / theme switching
- They're setting up the layout of a new page (sidebar, topbar, mobile menu)

If the user is working in a framework you haven't seen yet (Bulma, Foundation, custom), default to the **vanilla** integration guide — the tokens and classes are framework-neutral.

## What you get

```
modern-minimal-ui/
├── SKILL.md                  ← this file
├── assets/
│   ├── tokens.css            ← CSS variables (light + dark themes)
│   └── components.css        ← component classes (mmu-* prefix)
└── references/
    ├── components.md         ← HTML markup + vanilla-JS state toggles
    ├── bootstrap5.md         ← Bootstrap 5 integration (re-skin to indigo)
    ├── tailwind.md           ← Tailwind config + arbitrary-value patterns
    └── vanilla.md            ← Plain HTML/CSS integration
```

The two `assets/*.css` files are the canonical source of truth. The framework guides explain how to **layer** them on top of the host framework.

## Working with this skill — step by step

1. **Detect the host CSS framework.** Look for `package.json` (Tailwind, styled-components, MUI), `pom.xml` / `build.gradle` (Thymeleaf usually + Bootstrap via webjars), or a raw `index.html`. If unclear, ask the user.

2. **Choose the right reference file** based on what you find:
   - Bootstrap 5 → read `references/bootstrap5.md`
   - Tailwind → read `references/tailwind.md`
   - Anything else → read `references/vanilla.md`

3. **Install the assets.** Copy `assets/tokens.css` and `assets/components.css` into the project's static assets folder (commonly `static/css/mmu/` or `public/css/mmu/`). Link them in the page `<head>` **after** the host framework's CSS so token overrides apply.

4. **Set up layout first if the page has none.** A floating hero card on a blank body looks worse than a generic Bootstrap page. Install one of the two app shells (`mmu-shell--topbar` or `mmu-shell--sidebar`) — both are responsive and degrade to a hamburger drawer on mobile. See `references/components.md`.

5. **Wire the theme toggle.** Inline the boot script in `<head>` (before stylesheets load) so dark-mode users don't see a light-mode flash. Then add the toggle button somewhere in the header. The full script is in `references/components.md` under "Theme toggle".

6. **Compose pages from the components.** Pull markup snippets from `references/components.md` for each piece the page needs. Mix freely with host-framework utilities (`row`, `col-md-6`, `flex`, etc.).

7. **Verify in both themes and on mobile.** Toggle dark mode and resize the browser to ≤768px before declaring the page done. Touch targets stay ≥44px because the components already enforce that.

## Design principles (the why)

These shape every decision in `tokens.css` and `components.css`:

- **Indigo accent on a calm slate base.** Default Bootstrap blue `#0d6efd` reads as "form on a corporate site". Indigo `#6366f1` reads as "modern tool". The violet `#8b5cf6` token is available for opt-in gradient accents, but the default palette is solid indigo on white/slate — not gradient-heavy.
- **Restraint over flash.** No body radial gradients, no gradient text by default, no colored shadows (`box-shadow` uses neutral slate alphas, not indigo glow). The progress bar is solid accent, not gradient. The percent-hero number is solid indigo, not gradient text. Loud visual effects make tool UIs feel like marketing pages — that's the opposite of what's wanted.
- **No emoji in UI affordances.** Buttons, toggles, badges, and chips use inline SVG icons (with `stroke="currentColor"` so they follow text color and dark-mode tokens), or plain text labels. Emoji rendering is OS-dependent (different glyphs across macOS/Windows/Android), takes vertical space unpredictably, and reads as informal in a tool UI. The theme toggle uses a sun ↔ moon SVG pair, not `☀ ☾`.
- **Chips are calm pastel + strong text — not saturated.** Soft backgrounds (`#dbeafe`, `#dcfce7`, `#fef3c7`, `#ede9fe`) with darker text on top. This keeps a card grid feeling like a tool, not a kids' app.
- **Theme toggle lives at the top-right of the header.** That's where users have learned to look (Linear, Vercel, GitHub, Stripe). The header is the only correct home for it — never inside the page body card. Header layout convention is **brand on the left → primary nav in the middle → `.mmu-toolbar` on the right** (theme toggle + any user menu + hamburger). The `.mmu-toolbar` uses `margin-left: auto` so it pins right even if the nav is empty.

- **Components do not crowd each other.** Adjacent input boxes, cards, and rows need real breathing room — gaps that read as "two distinct things" rather than "one bumpy thing". The default spacing tokens to use:
  - **Between sibling form fields in a 2-column grid**: row-gap `1.5rem`, column-gap `2rem` (24/32 px). Smaller than that and the two inputs visually merge.
  - **Between form sections** (e.g. metadata fields ↔ output formats ↔ file dropzone): `2rem` separator, optionally with a `1px solid var(--mmu-border)` divider when the form is long.
  - **Between hero card and the first content card**: `1.5rem` minimum.
  - **Inside a field** (label → input → hint): `0.4–0.5rem` between elements; the hint sits *under* the input, never inline.
  - **Card internal padding**: `1.5rem` minimum on desktop. `mmu-surface-card` already ships with this — don't shrink it.
  
  When a layout looks busy or "boxes are touching", increase column-gap before anything else. Padding around the boxes does not fix proximity between them.

- **Nothing escapes its container.** Whenever you put a grid or a flex layout on a card or section, the children must stay inside its visible bounds at every viewport width. Two common ways content escapes:
  - **Grid/flex item with intrinsic min-width.** `input`, `select`, and even long unbreakable strings have a default `min-width: auto`, which means the grid/flex track refuses to shrink below the item's own min-content size — pushing the parent wider than its assigned column. Fix: use `grid-template-columns: repeat(N, minmax(0, 1fr))` on the container **and** `min-width: 0` on every grid/flex child. The `minmax(0, ...)` opt-out alone isn't always enough; both sides need to agree.
  - **Nested grids/flex with their own `minmax(140px, 1fr)`.** When a chip group or card grid lives inside a narrow parent column, its own minmax floor (e.g. 140 px chip width) can overflow the parent. Fix: drop the minmax floor when nested, or use `auto-fill` instead of `auto-fit` so it gracefully wraps to a single column instead of horizontal overflow.
  - **Absolutely-positioned children with negative offsets** (X buttons at `top: -0.25rem`, badges at `right: -0.5rem`). These intentionally sit *outside* their relative parent, which is fine — but the *grandparent* must have enough padding to absorb them, or the absolute child appears clipped or escapes the card. When you add `position: absolute` with a negative offset, audit one level up.

  Tools that catch this fast: open DevTools, set viewport to 375 × 812, and look for horizontal scrollbars on `<main>` or on individual cards. If a scrollbar appears, something is overflowing. Don't ship until it's gone.

- **Visual verification is required before declaring done.** Run the page in a browser — both desktop width and at 375 px (iPhone SE) — and confirm:
  - Sticky header stays at the top after scrolling and the theme toggle is reachable
  - No two input/card/chip boxes appear to "touch" or visually merge
  - Hover/focus states actually trigger and the focus ring is visible on every interactive element
  - Light → dark toggle has no broken contrast (test every component, not just the header)
  - **No horizontal scrollbar appears on the page or on any card.** If one does, something inside is overflowing its container — fix it before moving on
  
  Without this check, layout regressions slip through because everything compiles and tests pass. The grader doesn't see layout — only you (or the user) do.
- **Cards over tables for results.** A card grid scans faster than a table and adapts to mobile without horizontal scroll. Tables are still right for dense tabular data where the user compares values across rows.
- **State on the wrapper, not the children.** Dropzone, timeline, and form chips toggle their visual state via a single class on the root element (`is-selected`, `is-active`, `is-done`). This keeps JS minimal and CSS predictable.
- **Vanilla JS, no jQuery.** Every interaction script in this skill uses native DOM APIs. jQuery would add 30 KB for nothing.
- **Theme via `data-theme` attribute, not `prefers-color-scheme` alone.** The user's explicit choice (saved to localStorage) must win over OS preference. The dark token block applies only when `data-theme="dark"` is on `<html>`.
- **Responsive grid; touch-target floor.** All interactive elements (buttons, hamburger, theme toggle, dropzone change button) are sized to ≥44×44 px even at the smallest breakpoint, per WCAG 2.5.5.
- **No inline `style` attributes for static styling.** Every visual rule belongs in a CSS file so it picks up dark-mode tokens, responsive breakpoints, and `prefers-reduced-motion` automatically. Inline styles bypass all of that and scatter styling decisions across templates where they're easy to lose. Prefer the `mmu-*` component classes, the small utilities (`mmu-toolbar`), or the host framework's utility classes (Bootstrap `ms-auto`, Tailwind `ml-auto`). The only acceptable use of `element.style.*` is **dynamic runtime values** that the CSS cannot express ahead of time — the most common case is `style.width` on a progress bar, set from JS in response to events. Configuration like step counts uses `data-*` attributes with attribute-selector CSS rules instead (see `mmu-timeline[data-steps="N"]`).

## UI/UX checklist before declaring done

Run through these explicitly when finishing a page:

- [ ] Layout shell present? (`mmu-shell--topbar` or `mmu-shell--sidebar`, not a naked `<body>`)
- [ ] Dark theme works? Toggle and re-check every component
- [ ] Mobile (≤768px) works? Sidebar collapses to hamburger drawer; touch targets remain finger-sized
- [ ] No layout shift on theme switch? (Boot script inlined in `<head>` before stylesheets)
- [ ] Reduced motion respected? (The bundled CSS does this for you via `prefers-reduced-motion`)
- [ ] Focus rings visible on keyboard navigation? (mmu components keep Bootstrap/native focus styles intact)
- [ ] No jQuery in any new script you added
- [ ] No `style="..."` attributes for static styling — only runtime-dynamic values like progress bar width are allowed via `element.style.*`
- [ ] No emoji glyphs in UI elements — every icon is an inline SVG (or plain text). The only acceptable emoji usage is inside actual user content (e.g. user-written messages), never in your own labels/buttons/badges
- [ ] Theme toggle is at the top-right of the header, with sun/moon SVG icons (not text labels like "Dark Mode" — too verbose for a 40×40 button)
- [ ] Visual restraint: at most one gradient surface per page (and even that is optional). No colored box-shadows on cards. The default look is calm white/slate cards with a single indigo accent color, not gradient soup
- [ ] **Adjacent boxes are not crowded.** Look at the page in a browser at full width — if any two input/card/chip boxes appear to touch each other or visually merge, increase the column-gap (default `2rem` between 2-column grid cells, not `1rem` or `1.25rem`)
- [ ] **App shell header is present and correctly ordered.** Layout from left to right: brand → primary nav → `.mmu-toolbar` (theme toggle + user actions + hamburger). The theme toggle is in the toolbar, *not* in the page body. Header is sticky and stays visible on scroll
- [ ] **Browser-verified at two widths.** Opened the file in a browser at desktop and at ~375 px. Confirmed nothing collapses, overflows, or merges visually. Toggled light↔dark and re-checked every component
- [ ] **No horizontal scrollbar at 375 px** on `<main>` or on any card. If one appears, find the offending grid/flex item — usually an `input`/`select` missing `min-width: 0`, or a nested `minmax(140px, ...)` that overflows the parent column. Fix by adding `min-width: 0` to children and switching nested `auto-fit` → `auto-fill` so it wraps instead of overflowing

## Component summary

| Want… | Use |
|---|---|
| App-level layout with persistent nav | `mmu-shell--sidebar` |
| App-level layout for single-page tool | `mmu-shell--topbar` |
| Mobile menu toggle | `mmu-hamburger` (auto-shown <768px) |
| Light/dark switch | `mmu-theme-toggle` + boot script |
| Landing/hero panel | `mmu-hero-card` |
| Content section panel | `mmu-surface-card` |
| Small label+value cells | `mmu-meta-grid` + `mmu-meta-card` |
| Multi-select option chips | `mmu-chip-card` (uses `:has()`) |
| Drag-and-drop file input | `mmu-dropzone` with 4 states (default/dragover/selected/invalid) |
| Giant gradient progress number | `mmu-percent-hero` |
| Thin progress bar | `mmu-progress` |
| Pipeline status (done/active/pending) | `mmu-timeline` |
| Result/output listing | `mmu-card-grid` + `mmu-card` + `mmu-chip--*` |
| Locale or mode switch | `mmu-segment` |

Each entry has full markup, state machine, and JS handler examples in `references/components.md`. Read that file before composing a new component — copying the snippets is faster (and less error-prone) than rebuilding from prose.

## What this skill is NOT

- Not a full UI kit. There are no modals, dropdowns, tooltips, or date pickers. Lean on the host framework (Bootstrap, Headless UI, etc.) for those — this skill stays focused on the polish layer that those frameworks don't ship.
- Not a CSS reset. The `mmu-body` class adds a backdrop and base typography, but it doesn't override headings, lists, or default form styles. Use your host framework or a separate reset for that.
- Not opinionated about JS frameworks. The vanilla JS examples translate naturally to React/Vue/Svelte state — `classList.toggle()` becomes a className expression, `addEventListener` becomes a JSX handler. The `mmu-*` CSS is the same in either world.
