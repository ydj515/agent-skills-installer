# Bootstrap 5 integration

The bundled CSS sits **on top of** Bootstrap — it doesn't replace it. The pattern is: keep using Bootstrap's grid, forms, buttons, and utilities; let the design system override the colors and provide a few additional components Bootstrap doesn't have (timeline, dropzone, percent hero).

## Setup

1. Copy `assets/tokens.css` and `assets/components.css` into your static assets folder (e.g. `src/main/resources/static/css/mmu/`).
2. Link them **after** Bootstrap so the variable overrides apply:

```html
<link rel="stylesheet" href="/webjars/bootstrap/dist/css/bootstrap.min.css">
<link rel="stylesheet" href="/css/mmu/tokens.css">
<link rel="stylesheet" href="/css/mmu/components.css">
<link rel="stylesheet" href="/css/app.css">  <!-- your own overrides last -->
```

3. Optionally add `class="mmu-body"` to `<body>` to apply the radial-gradient background.

## Re-skinning Bootstrap to indigo

Bootstrap's `primary` defaults to blue `#0d6efd`. Override its CSS-variable-driven properties to repaint primary buttons, focus rings, and form-check inputs:

```css
/* In your project's own CSS, *after* mmu/ files */

.btn-primary {
    background-color: var(--mmu-accent);
    border-color: var(--mmu-accent);
}

.btn-primary:hover,
.btn-primary:focus-visible {
    background-color: var(--mmu-accent-strong);
    border-color: var(--mmu-accent-strong);
}

.btn-outline-primary {
    color: var(--mmu-accent);
    border-color: var(--mmu-accent);
}

.btn-outline-primary:hover,
.btn-outline-primary:focus-visible {
    background-color: var(--mmu-accent);
    border-color: var(--mmu-accent);
    color: var(--mmu-text-on-accent);
}

.form-control:focus,
.form-select:focus,
.form-check-input:focus {
    border-color: var(--mmu-accent);
    box-shadow: 0 0 0 0.2rem var(--mmu-accent-soft);
}

.form-check-input:checked {
    background-color: var(--mmu-accent);
    border-color: var(--mmu-accent);
}
```

> If you want to deeply integrate (no override layer), recompile Bootstrap from source with `$primary: #6366f1` in your `_variables.scss`. That's nicer but requires a Sass build.

## Mixing Bootstrap utilities with mmu classes

These compose freely — combine on the same element:

```html
<section class="mmu-hero-card mt-4">                  <!-- mmu card + bootstrap margin -->
<div class="mmu-meta-grid row g-3">                    <!-- pick one, both work -->
<a class="btn btn-sm btn-primary mmu-btn-with-icon">   <!-- bootstrap button + mmu icon row -->
```

The `mmu-btn-with-icon` utility is functionally identical to a `d-inline-flex align-items-center gap-2` combo — pick whichever reads better in context.

## Bootstrap Icons

`bi-*` classes pair well with mmu components. Recommended icons:

| Component slot | Icon |
|---|---|
| dropzone default | `bi-cloud-arrow-up` |
| dropzone success | `bi-check-circle-fill` |
| dropzone remove | `bi-x-lg` |
| timeline (intake) | `bi-box-arrow-in-down` |
| timeline (analysis) | `bi-braces` |
| timeline (diagrams) | `bi-diagram-3` |
| timeline (rendering) | `bi-file-earmark-richtext` |
| timeline (packaging) | `bi-box-seam` |
| card chip (docx) | `bi-file-earmark-word` |
| card chip (xlsx) | `bi-file-earmark-spreadsheet` |
| card chip (md) | `bi-markdown` |
| download button | `bi-download` |

## Thymeleaf integration

Component slots like timeline labels, dropzone copy, and chip headers benefit from i18n. Use `th:text` for static text and `th:attr` for `aria-label`:

```html
<span class="mmu-timeline__label" th:text="#{progress.step.analysis}">Analysis</span>

<button class="mmu-dropzone__remove" data-dropzone-remove
        th:attr="aria-label=#{dropzone.remove}, title=#{dropzone.remove}">
    <i class="bi bi-x-lg" aria-hidden="true"></i>
</button>
```

Hidden screen-reader-only labels (useful when tests assert specific words exist in the markup):

```html
<div class="visually-hidden" th:text="|#{result.module} · #{result.format} · #{result.filename} · #{result.size}|"></div>
```
