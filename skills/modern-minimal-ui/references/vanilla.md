# Vanilla HTML / CSS integration

No framework. Just `<link>` the two CSS files and use the `mmu-` classes.

## Setup

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Your App</title>

    <!-- Inline this small script BEFORE the stylesheet to prevent a light-mode flash -->
    <script>
        (function () {
            var s = localStorage.getItem('mmu-theme');
            if (s === 'dark' || s === 'light') {
                document.documentElement.setAttribute('data-theme', s);
            } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.setAttribute('data-theme', 'dark');
            }
        })();
    </script>

    <link rel="stylesheet" href="/css/mmu/tokens.css">
    <link rel="stylesheet" href="/css/mmu/components.css">
    <link rel="stylesheet" href="/css/app.css">
</head>
<body class="mmu-body">
    <!-- shell + content -->
</body>
</html>
```

## Minimal page skeleton (vanilla, no jQuery)

```html
<div class="mmu-shell mmu-shell--topbar" data-shell>
    <header class="mmu-shell__header">
        <a class="mmu-brand" href="/">Your App</a>
        <div class="mmu-toolbar">
            <button type="button" class="mmu-theme-toggle" data-theme-toggle aria-label="Theme">
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
        <section class="mmu-hero-card">
            <h1 class="mmu-page-title">Hello</h1>
        </section>
    </main>
</div>

<script src="/js/mmu/shell.js"></script>
```

`/js/mmu/shell.js` bundles the hamburger + theme toggle handlers from `components.md`. Total weight: well under 1 KB minified, no dependencies.

## Why no jQuery

Modern DOM APIs (`querySelector`, `classList`, `addEventListener`, `closest`, `replaceChildren`) cover everything the components need. jQuery would add ~30 KB for zero added capability here. Stick with vanilla.

If you're maintaining a legacy page that already has jQuery loaded, the component scripts still work — they don't conflict with `$` because they don't use it. You can keep jQuery for the rest of the legacy page and use vanilla for new components without issue.
