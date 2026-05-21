# Components — HTML markup + state toggles

All markup below uses framework-neutral classes from `assets/components.css`. They are prefixed `mmu-` to coexist with Bootstrap/Tailwind classnames in the same project. Mix host-framework utility classes freely (e.g. `class="mmu-card btn-with-icon"` or Tailwind `class="mmu-card flex"`) — `mmu-` rules only set the design-system specifics.

## Table of contents

| Component | When to use |
|---|---|
| [Spacing reference](#spacing-reference) | Default gaps between fields, sections, and cards |
| [App shell (topbar)](#app-shell--topbar) | Single-page tools — branding header, content below |
| [App shell (sidebar)](#app-shell--sidebar) | Multi-page apps — sticky sidebar nav, content right |
| [Hamburger toggle](#hamburger-toggle) | Mobile-only — collapses sidebar/topnav into a drawer |
| [Theme toggle](#theme-toggle) | Light/dark switch with `data-theme` attribute |
| [Hero / surface cards](#hero--surface-cards) | Top-of-page headline panels and content panels |
| [Form layout](#form-layout) | Two-column field grid with proper breathing room |
| [Meta grid](#meta-grid) | Small "label + value" cells in a row (e.g. version, expiry) |
| [Form chip cards](#form-chip-cards) | Multi-select option cards (output formats, tags, etc.) |
| [File dropzone (4-state)](#file-dropzone) | Drag-and-drop file input with default / dragover / selected / invalid states |
| [Percent hero](#percent-hero) | Giant gradient percentage for progress pages |
| [Progress bar](#progress-bar) | Thin gradient bar — pair with percent hero |
| [Step timeline](#step-timeline) | Done / active / pending pipeline indicator |
| [Card grid + chips](#card-grid) | Result/output listings with colored format chips |
| [Segmented toggle](#segmented-toggle) | Locale / mode switch |

---

## Spacing reference

This is the spacing language the design system uses. Don't pull values out of thin air — match these so adjacent components don't visually merge.

| Where | Gap | Notes |
|---|---|---|
| Sibling fields in a 2-col grid (column-gap) | **`2rem` (32 px)** | Less and the two inputs feel attached. Common bug; the right call is "more space, not less". |
| Sibling fields (row-gap) | `1.5rem` (24 px) | |
| Between form sections (metadata vs output vs dropzone) | `2rem` plus optional `1px solid var(--mmu-border)` divider for long forms | |
| Hero card → first content card | `1.5rem` (24 px) minimum | Use a host-framework utility (`mt-4`, `mt-6`) or a margin on the second card. |
| Inside a `.app-field`: label → input | `0.45rem` (≈7 px) | Tight but distinct. |
| Inside a `.app-field`: input → hint | `0.45rem` (≈7 px) | Hint always *below* the input, never on the same line. |
| Card internal padding (`.mmu-surface-card`) | `1.5rem` desktop, `1.25rem` ≤768 px | The skill already provides this — don't override smaller. |
| Header internal padding (`.mmu-shell__header`) | `0.75rem 1.25rem` | The skill already provides this. |
| Page top padding (`.mmu-shell__main`) | `2rem clamp(1rem, 3vw, 2.5rem) 3rem` | The skill already provides this. |

> When the layout looks "boxy" or "two things touching", the fix is almost always **column-gap or row-gap, not padding**. Padding adds room *inside* a box; gap adds room *between* boxes.

### Containment rules (so nothing overflows the grid)

Grids and flex layouts can be silently broken by children with intrinsic min-content sizes. Cement these rules:

1. **Container** uses `grid-template-columns: repeat(N, minmax(0, 1fr))`. The `minmax(0, ...)` is non-negotiable — without it, tracks refuse to shrink below the children's intrinsic min-width.
2. **Children** that hold inputs, selects, long strings, or nested grids set `min-width: 0` (e.g. `.app-field { min-width: 0; }`). The skill's `components.css` does this for cards and inputs automatically.
3. **Nested grid inside a narrow column** prefers `auto-fill` over `auto-fit`, with a smaller floor — `repeat(auto-fill, minmax(120px, 1fr))` instead of `(auto-fit, minmax(160px, 1fr))`. `auto-fit` collapses empty tracks (good in isolation, bad when nested because remaining items stretch past the parent).
4. **Absolutely-positioned children with negative offsets** (X buttons, badges that "hang off"): the relatively-positioned grandparent must have `padding ≥ |offset|` so the floating piece doesn't overlap the card edge or clip on `overflow` ancestors. Skill components keep their negative offsets within ~`0.25rem` so default padding absorbs them.

**Verification**: open DevTools, set viewport to 375 × 812, and check for horizontal scrollbars on `<main>` or on any individual card. If one appears, something inside is overflowing — apply rules 1–4 above to that subtree.

---

---

## App shell — topbar

For single-page tools or short workflows. The header sticks, content scrolls below it. The theme toggle goes in `.mmu-toolbar` at the top-right.

```html
<div class="mmu-shell mmu-shell--topbar" data-shell>
    <header class="mmu-shell__header">
        <a class="mmu-brand" href="/">Your App</a>

        <nav class="mmu-shell__nav" aria-label="Primary">
            <ul class="mmu-nav">
                <li><a class="mmu-nav__link is-active" href="/">Home</a></li>
                <li><a class="mmu-nav__link" href="/docs">Docs</a></li>
            </ul>
        </nav>

        <div class="mmu-toolbar">
            <button type="button" class="mmu-theme-toggle" data-theme-toggle aria-label="Toggle theme">
                <svg class="mmu-theme-toggle__icon--sun" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41"/>
                </svg>
                <svg class="mmu-theme-toggle__icon--moon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
            </button>
            <button type="button" class="mmu-hamburger" data-hamburger aria-label="Menu" aria-expanded="false">
                <span class="mmu-hamburger__bars" aria-hidden="true"><span></span><span></span><span></span></span>
            </button>
        </div>
    </header>

    <main class="mmu-shell__main">
        <!-- page content -->
    </main>
</div>
```

> The theme toggle lives **at the top-right of the header** by convention — that's where users have learned to look (Linear, Vercel, GitHub, Stripe all put it there). `.mmu-toolbar` pushes it via `margin-left: auto` so other header content stays left.

On mobile (≤768px), the `mmu-shell__nav` collapses; the hamburger surfaces it as a slide-down drawer when `.mmu-shell` has `.is-open`.

## App shell — sidebar

For multi-page tools with persistent navigation. On mobile, the sidebar becomes a slide-in drawer overlaid on the content; tap the backdrop to close.

```html
<div class="mmu-shell mmu-shell--sidebar" data-shell>
    <aside class="mmu-shell__sidebar" aria-label="Primary">
        <a class="mmu-brand" href="/">Your App</a>
        <ul class="mmu-nav">
            <li><a class="mmu-nav__link is-active" href="/">Dashboard</a></li>
            <li><a class="mmu-nav__link" href="/jobs">Jobs</a></li>
            <li><a class="mmu-nav__link" href="/settings">Settings</a></li>
        </ul>
    </aside>

    <header class="mmu-shell__header">
        <button type="button" class="mmu-hamburger" data-hamburger aria-label="Open menu" aria-expanded="false">
            <span class="mmu-hamburger__bars" aria-hidden="true"><span></span><span></span><span></span></span>
        </button>
        <h1 class="mmu-page-title">Current Page</h1>
        <div class="mmu-toolbar">
            <button type="button" class="mmu-theme-toggle" data-theme-toggle aria-label="Toggle theme">
                <svg class="mmu-theme-toggle__icon--sun" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41"/>
                </svg>
                <svg class="mmu-theme-toggle__icon--moon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
            </button>
        </div>
    </header>

    <main class="mmu-shell__main">
        <!-- page content -->
    </main>

    <div class="mmu-shell__backdrop" data-shell-backdrop></div>
</div>
```

> **If the page has no layout at all yet, install one of these shells first.** Don't render `mmu-hero-card` directly inside `<body>` — the shell sets up the responsive grid, sticky header, and safe-area paddings that the cards expect.

## Hamburger toggle

Vanilla JS only (no jQuery). The same script handles both shell variants — it just toggles `is-open` on `.mmu-shell`.

```js
const shell = document.querySelector('[data-shell]');
const hamburger = document.querySelector('[data-hamburger]');
const backdrop = document.querySelector('[data-shell-backdrop]');

function setOpen(open) {
    shell.classList.toggle('is-open', open);
    hamburger.setAttribute('aria-expanded', String(open));
}

hamburger?.addEventListener('click', () => setOpen(!shell.classList.contains('is-open')));
backdrop?.addEventListener('click', () => setOpen(false));

// Close on Escape (good keyboard UX)
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
});

// Close when navigating to a section on mobile
shell.querySelectorAll('.mmu-nav__link').forEach((a) =>
    a.addEventListener('click', () => setOpen(false))
);
```

## Theme toggle

Theme state is stored on `<html data-theme="...">` and persisted in `localStorage`. The toggle is a single button — the sun/moon icons swap automatically via CSS.

```js
const STORAGE_KEY = 'mmu-theme';
const root = document.documentElement;

function applyTheme(theme) {
    if (theme === 'dark' || theme === 'light') {
        root.setAttribute('data-theme', theme);
    } else {
        root.removeAttribute('data-theme'); // 'system' = follow prefers-color-scheme
    }
}

// On boot: hydrate from localStorage, or fall back to OS preference
(function bootTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
        applyTheme(saved);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        applyTheme('dark');
    }
})();

document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
    const current = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
});
```

> **Place the boot script in `<head>` before stylesheets load** to avoid a "light flash" before dark mode applies. Inline it if possible.

---

## Hero / surface cards

```html
<section class="mmu-hero-card">
    <h1 class="mmu-page-title">Page title</h1>
</section>

<section class="mmu-surface-card mt-4">
    <!-- main content -->
</section>
```

- `mmu-hero-card--compact` reduces padding for non-landing pages.
- Adjust spacing between cards with your host framework's spacing utilities (Bootstrap `mt-4`, Tailwind `mt-6`, or plain margin).

---

## Form layout

The skill doesn't ship opinionated input/select styles (host frameworks already do), but the **layout around them** should follow this template so fields don't crowd each other:

```html
<form class="mmu-surface-card" novalidate>
    <div class="app-form__grid">
        <div class="app-field">
            <label class="app-field__label" for="programName">Program name</label>
            <input class="app-input" type="text" id="programName" name="programName" required>
            <p class="app-field__hint">The display name used in generated artifacts.</p>
        </div>

        <div class="app-field">
            <label class="app-field__label" for="version">Version</label>
            <input class="app-input" type="text" id="version" name="version" required>
            <p class="app-field__hint">Semver or tag.</p>
        </div>

        <div class="app-field app-field--full">
            <!-- A wide field (file picker, textarea, fieldset of chips) spans both columns -->
        </div>
    </div>

    <div class="app-form__footer">
        <button type="reset" class="btn btn-outline-primary">Reset</button>
        <button type="submit" class="btn btn-primary">Submit</button>
    </div>
</form>
```

The accompanying CSS (drop into your project's `styles.css`):

```css
.app-form__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.5rem 2rem;  /* row-gap 1.5rem, column-gap 2rem — wider gap matters */
}

.app-field {
    display: grid;
    gap: 0.45rem;
    min-width: 0;       /* lets long values truncate instead of forcing overflow */
}

.app-field--full {
    grid-column: 1 / -1;
}

.app-field__label {
    color: var(--mmu-text);
    font-size: 0.88rem;
    font-weight: 600;
    line-height: 1.2;
}

.app-field__hint {
    margin: 0;
    color: var(--mmu-text-muted);
    font-size: 0.82rem;
    line-height: 1.4;
}

.app-input {
    width: 100%;
    min-height: 2.75rem;       /* >=44 px touch target */
    padding: 0.65rem 0.85rem;
    border: 1px solid var(--mmu-border);
    border-radius: var(--mmu-radius-md);
    background: var(--mmu-surface);
    color: var(--mmu-text);
    font: inherit;
    font-size: 0.95rem;
    line-height: 1.4;
    transition: border-color var(--mmu-transition-fast), box-shadow var(--mmu-transition-fast);
}

.app-input:focus,
.app-input:focus-visible {
    outline: none;
    border-color: var(--mmu-accent);
    box-shadow: 0 0 0 3px var(--mmu-accent-soft);
}

.app-form__footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.6rem;
    margin-top: 2rem;            /* 2rem section separator */
    padding-top: 1.25rem;
    border-top: 1px solid var(--mmu-border);
}

@media (max-width: 640px) {
    .app-form__grid {
        grid-template-columns: 1fr;
        gap: 1.25rem;
    }
    .app-form__footer {
        flex-direction: column-reverse;
    }
    .app-form__footer > * {
        width: 100%;
    }
}
```

> The column-gap `2rem` is the load-bearing value. If you only remember one thing from this section, it's that: two input boxes side by side need ~32 px between them or they read as a single squished thing.

---

## Meta grid

```html
<div class="mmu-meta-grid">
    <div class="mmu-meta-card">
        <span class="mmu-meta-label">Version</span>
        <strong class="mmu-meta-value">v1.2.3</strong>
    </div>
    <div class="mmu-meta-card">
        <span class="mmu-meta-label">Expires</span>
        <strong class="mmu-meta-value">2026-01-01 18:00</strong>
    </div>
</div>
```

Grid auto-fits cells with `minmax(180px, 1fr)`, so you can pour any number of cards in.

---

## Form chip cards

Use when the user picks one or more options visually. `:has(input:checked)` highlights the selected card without JS.

```html
<label class="mmu-chip-card">
    <input type="checkbox" name="formats" value="docx" checked>
    <span>docx</span>
</label>
```

If you need to support older browsers without `:has()`, fall back to toggling an `is-checked` class on the label via change event listener.

---

## File dropzone

The dropzone has **four mutually-exclusive states** driven by class toggles on the root element:

| State | Class | Visible body |
|---|---|---|
| default | (none) | `mmu-dropzone__body` |
| dragover | `is-dragover` | `mmu-dropzone__body` (styled) |
| selected | `is-selected` | `mmu-dropzone__success` |
| invalid | `is-invalid` | (whichever was last visible, red border) |

```html
<label class="mmu-dropzone" data-dropzone tabindex="0">
    <input type="file" accept=".zip" class="visually-hidden" data-dropzone-input>

    <span class="mmu-dropzone__body" data-dropzone-default>
        <svg class="mmu-dropzone__icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <span class="mmu-dropzone__title">Drop your ZIP here</span>
        <span class="mmu-dropzone__hint">.zip only</span>
    </span>

    <span class="mmu-dropzone__success" data-dropzone-selected>
        <button type="button" class="mmu-dropzone__remove" data-dropzone-remove aria-label="Remove file">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
        </button>
        <svg class="mmu-dropzone__success-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <span class="mmu-dropzone__title">File attached</span>
        <span class="mmu-dropzone__meta">
            <span class="mmu-dropzone__filename" data-dropzone-filename></span>
            <span aria-hidden="true">·</span>
            <span class="mmu-dropzone__size" data-dropzone-size></span>
        </span>
        <button type="button" class="btn btn-outline-primary btn-sm" data-dropzone-change>
            Choose another file
        </button>
    </span>
</label>
```

> All icons are inline SVG with `stroke="currentColor"` so they pick up the surrounding text color and dark-mode tokens automatically. **No emoji.** Emoji rendering is OS-dependent (different glyphs across macOS/Windows/Android), takes vertical space inconsistently, and reads as informal in a tool UI.

### State toggle JS

```js
const root = document.querySelector('[data-dropzone]');
const input = root.querySelector('[data-dropzone-input]');
const fname = root.querySelector('[data-dropzone-filename]');
const fsize = root.querySelector('[data-dropzone-size]');
const remove = root.querySelector('[data-dropzone-remove]');
const change = root.querySelector('[data-dropzone-change]');

const fmtBytes = (b) => b < 1024 ? `${b} B`
  : b < 1024 ** 2 ? `${(b/1024).toFixed(1)} KB`
  : `${(b/1024**2).toFixed(2)} MB`;

const isValid = (f) => f && f.name.toLowerCase().endsWith('.zip');

const apply = (file) => {
    if (file) {
        fname.textContent = file.name;
        fsize.textContent = fmtBytes(file.size);
    }
    root.classList.toggle('is-selected', !!(file && isValid(file)));
    root.classList.toggle('is-invalid', !!(file && !isValid(file)));
};

input.addEventListener('change', () => apply(input.files?.[0]));
remove?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); input.value = ''; apply(null); });
change?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); input.click(); });

// Drag-drop
['dragenter', 'dragover'].forEach(evt =>
    root.addEventListener(evt, (e) => { e.preventDefault(); root.classList.add('is-dragover'); })
);
['dragleave', 'dragend', 'drop'].forEach(evt =>
    root.addEventListener(evt, () => root.classList.remove('is-dragover'))
);
root.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    apply(file);
});
```

> The X button uses `e.stopPropagation()` because the dropzone root is a `<label>` — without it, clicking X would also trigger the file picker.

---

## Percent hero

```html
<div class="mmu-percent-hero">
    <strong class="mmu-percent-hero__value">35%</strong>
    <span class="mmu-percent-hero__stage">Parsing sources</span>
</div>
```

Update via JS by setting `textContent` on the two children. The number uses `background-clip: text` to render the indigo→violet gradient — works in all evergreen browsers.

---

## Progress bar

Pair the percent hero with a thin bar below for finer-grained progress:

```html
<div class="mmu-progress" role="progressbar" aria-valuenow="35" aria-valuemin="0" aria-valuemax="100">
    <div class="mmu-progress__bar" data-progress-bar></div>
</div>
```

```js
const bar = document.querySelector('[data-progress-bar]');
const wrapper = bar.closest('.mmu-progress');
function setProgress(pct) {
    bar.style.width = `${pct}%`;          // dynamic value — must be set at runtime
    wrapper.setAttribute('aria-valuenow', String(pct));
}
```

> Setting `style.width` from JS is the one place where touching `.style` is appropriate: the value is dynamic and changes frequently. Don't pre-bake an initial width in the markup with `style="width: 0%"` — start with no width set (zero is the default since the bar has no min-width) and let JS drive it from the first event.

---

## Step timeline

```html
<ol class="mmu-timeline" aria-label="pipeline progress">
    <li class="mmu-timeline__step is-done" data-step="intake">
        <span class="mmu-timeline__dot">1</span>
        <span class="mmu-timeline__label">Intake</span>
    </li>
    <li class="mmu-timeline__step is-active" data-step="analysis">
        <span class="mmu-timeline__dot">2</span>
        <span class="mmu-timeline__label">Analysis</span>
    </li>
    <li class="mmu-timeline__step" data-step="diagrams">
        <span class="mmu-timeline__dot">3</span>
        <span class="mmu-timeline__label">Diagrams</span>
    </li>
    <li class="mmu-timeline__step" data-step="rendering">
        <span class="mmu-timeline__dot">4</span>
        <span class="mmu-timeline__label">Rendering</span>
    </li>
    <li class="mmu-timeline__step" data-step="packaging">
        <span class="mmu-timeline__dot">5</span>
        <span class="mmu-timeline__label">Packaging</span>
    </li>
</ol>
```

- Default step count is 5. For other counts (3–7), set `data-steps="4"` on the `<ol>` (no inline style needed — the attribute selector swaps the CSS variable).
- Substitute the `<span class="mmu-timeline__dot">` content with an SVG/icon font glyph.
- Substitute step labels with `<span th:text="#{...}">` for Thymeleaf i18n, or `{t('...')}` for React etc.

### JS toggle pattern

Map your application stages (potentially many) to a small fixed set of visible steps, then toggle two classes:

```js
const stageToStep = {
    EXTRACTING: 'intake', DETECTING_MODULES: 'intake',
    PARSING: 'analysis', CLASSIFYING: 'analysis', ASSIGNING_IDS: 'analysis',
    EXTRACTING_RELATIONS: 'diagrams', RENDERING_DIAGRAMS: 'diagrams',
    RENDERING_DOCX: 'rendering', RENDERING_XLSX: 'rendering', RENDERING_MD: 'rendering',
    PACKAGING: 'packaging',
};
const steps = ['intake', 'analysis', 'diagrams', 'rendering', 'packaging'];

function setStage(stage) {
    const idx = steps.indexOf(stageToStep[stage]);
    if (idx < 0) return;
    document.querySelectorAll('.mmu-timeline__step').forEach((el) => {
        const i = steps.indexOf(el.dataset.step);
        el.classList.toggle('is-done', i < idx);
        el.classList.toggle('is-active', i === idx);
    });
}
```

> Mapping many internal stages to a smaller visible set is intentional — the user reads progress, not engineering taxonomy. 5 steps fits cleanly on mobile too.

---

## Card grid

For result pages / output listings. Cards lift on hover with an indigo glow.

```html
<div class="mmu-card-grid" role="list">
    <article class="mmu-card" role="listitem">
        <div class="mmu-card__header">
            <span class="mmu-chip mmu-chip--blue">docx</span>
            <span class="mmu-card__size">1.2 MB</span>
        </div>
        <div class="mmu-card__subtitle">module:core</div>
        <div class="mmu-card__title">class-design_core_v1.docx</div>
        <div class="mmu-card__footer">
            <a class="btn btn-sm btn-primary mmu-btn-with-icon" href="...">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span>Download</span>
            </a>
        </div>
    </article>
</div>
```

### Chip variants

- `mmu-chip--blue` — structured documents (docx, json, xml)
- `mmu-chip--green` — data formats (xlsx, csv, parquet)
- `mmu-chip--amber` — text/markup (md, txt, log)
- `mmu-chip--violet` — code/auxiliary (yml, sql, sh)

Chip text is short (3–6 chars) and **always plain — no icon inside the chip**. Adding an icon to the chip makes the row noisy; if you need an icon per format, put it inside the download button instead.

Add new chip variants by following the same pattern (color + 10% alpha background). Define them in your project's CSS, not in the bundled `components.css`.

> Building the cards in JS? Use explicit DOM methods (`createElement`, `textContent`) rather than `innerHTML` to keep XSS resistance, especially if any field comes from user input or API responses.

---

## Segmented toggle

```html
<div class="mmu-segment" role="group">
    <a href="?lang=ko" class="mmu-segment__option is-active">KO</a>
    <a href="?lang=en" class="mmu-segment__option">EN</a>
</div>
```

Toggle `is-active` on click to switch.
