# Tailwind CSS integration

Tailwind users have two integration choices: **use the bundled CSS as-is** (simplest), or **port the tokens into your Tailwind theme** (most idiomatic).

## Option A — Use bundled CSS as-is

If your project uses Tailwind for utilities but doesn't need to expose the design tokens as Tailwind classes, just import the bundled stylesheets and use the `mmu-` component classes directly.

```css
/* src/styles/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@import "modern-minimal-ui/tokens.css";
@import "modern-minimal-ui/components.css";
```

Combine freely in JSX/HTML:

```html
<section class="mmu-hero-card mt-8 mx-auto max-w-4xl">
    <h1 class="mmu-page-title text-3xl md:text-4xl">Hello</h1>
</section>
```

The tokens (`var(--mmu-accent)` etc.) are CSS-variable-based, so they work anywhere — even inside Tailwind's arbitrary value syntax: `text-[color:var(--mmu-accent)]`.

## Option B — Port tokens into `tailwind.config.js`

Cleaner if you want `bg-accent`, `text-accent`, etc. to "just work" with Tailwind's utility pipeline.

```js
// tailwind.config.js
module.exports = {
    content: ["./src/**/*.{html,js,jsx,ts,tsx,vue,svelte}"],
    theme: {
        extend: {
            colors: {
                surface: "rgba(255, 255, 255, 0.94)",
                accent: {
                    DEFAULT: "#6366f1",
                    strong: "#4f46e5",
                    soft: "rgba(99, 102, 241, 0.12)",
                    2: "#8b5cf6",
                },
                slate: {
                    text: "#0f172a",
                    muted: "#64748b",
                },
                success: "#10b981",
            },
            borderRadius: {
                pill: "999px",
            },
            boxShadow: {
                mmu: "0 20px 50px rgba(15, 23, 42, 0.08)",
                "mmu-soft": "0 10px 24px rgba(15, 23, 42, 0.05)",
                "mmu-accent": "0 14px 34px rgba(99, 102, 241, 0.14)",
            },
            backgroundImage: {
                "mmu-accent": "linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)",
                "mmu-accent-diag": "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            },
        },
    },
};
```

Then write components purely in utility classes:

```html
<section class="bg-surface border border-slate-text/10 rounded-3xl shadow-mmu p-8">
    <h1 class="text-3xl font-bold tracking-tight text-slate-text">Hello</h1>
</section>

<div class="text-5xl font-extrabold bg-mmu-accent-diag bg-clip-text text-transparent">
    35%
</div>
```

## Option C — Hybrid

Pull in `tokens.css` for CSS variables, port nothing into Tailwind config, and use `var(...)` inside arbitrary values when you need them:

```html
<button class="bg-[color:var(--mmu-accent)] hover:bg-[color:var(--mmu-accent-strong)] text-white px-4 py-2 rounded-lg transition">
    Submit
</button>
```

This avoids Tailwind config churn and keeps the colors centralized in `tokens.css`. Good for incremental adoption.

## Component class equivalents in pure Tailwind

If you'd rather replicate the `mmu-` components with Tailwind utilities directly, here's the rough mapping:

| mmu class | Tailwind equivalent |
|---|---|
| `mmu-hero-card` | `bg-white/95 border border-slate-text/10 rounded-3xl shadow-mmu p-8` |
| `mmu-surface-card` | `bg-white/95 border border-slate-text/10 rounded-3xl shadow-mmu-soft p-6` |
| `mmu-card` | `grid gap-2 p-4 rounded-2xl border border-slate-text/10 bg-white shadow-mmu-soft hover:-translate-y-0.5 hover:shadow-mmu-accent transition` |
| `mmu-chip` | `inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider` |
| `mmu-percent-hero__value` | `text-6xl font-extrabold tracking-tight bg-mmu-accent-diag bg-clip-text text-transparent tabular-nums` |
| `mmu-progress` | `h-2 rounded-full bg-slate-text/5 overflow-hidden` |
| `mmu-progress__bar` | `h-full bg-mmu-accent rounded-full transition-[width]` |

> The state-driven components (`mmu-timeline__step.is-done`, `mmu-dropzone.is-selected`) are easier to keep as `mmu-` classes because the state transition is encoded in the CSS. Replicating them in pure Tailwind requires `data-*` attribute selectors or React state-based class toggling — workable, but `components.css` does the job in fewer lines.

## React / Vue / Svelte usage

The state-toggle JS from `components.md` translates directly to component state:

```jsx
function Dropzone({ onChange }) {
    const [file, setFile] = useState(null);
    const [invalid, setInvalid] = useState(false);
    return (
        <label
            className={`mmu-dropzone ${file ? "is-selected" : ""} ${invalid ? "is-invalid" : ""}`}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("is-dragover"); }}
            onDragLeave={(e) => e.currentTarget.classList.remove("is-dragover")}
            onDrop={(e) => { /* ... */ }}
        >
            {/* ... */}
        </label>
    );
}
```
