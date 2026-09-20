# UNTIL.

**You don't have forever.**

UNTIL is a single-page, interactive visualization of your life — how much of it you've lived, how much you may have left, and what your daily habits are quietly costing you in years.

No backend, no build step, no dependencies to install. Everything runs client-side and saves to your browser's `localStorage`.

## Live features

- **Your life in weeks** — a dynamically generated grid (one square per week of your estimated lifespan), with the current week highlighted and hover/tap tooltips showing the exact date.
- **Habit calculator** — turn daily hours (sleep, work, social media, etc.) into years of your life, visualized as bars.
- **What If** — drag a slider to see how many years and hours you'd reclaim by changing a habit.
- **Milestones** — add future goals with dates, shown on a timeline.
- **Make Today Count** — a closing, reflective screen with a randomized prompt.

All numbers are computed live from the date of birth and life expectancy you enter — nothing is hardcoded or simulated.

## Running it locally

No installation required.

1. Download `index.html`
2. Open it in any modern browser (double-click, or drag it into a browser window)

That's it. An internet connection is used only to load Google Fonts (Inter, Space Grotesk, JetBrains Mono) on first load; everything else works offline.

## Installing as an app (PWA)

UNTIL is a Progressive Web App: once it's hosted over HTTPS (e.g. GitHub Pages), you can install it like a native app, with its own icon (a "U." monogram matching the site's wordmark) and offline support.

- **On mobile**: open the site, then use your browser's "Add to Home Screen" option (Safari: Share → Add to Home Screen; Chrome: menu → Install app).
- **On desktop**: Chrome/Edge will show an install icon in the address bar.

Note: the install prompt and offline caching only activate when the site is served over HTTPS — opening `index.html` directly from disk (`file://`) works for everything except installability and offline mode, since browsers require a secure context for service workers.

## Tech

Vanilla HTML, CSS and JavaScript in a single file. No frameworks, no build tools, no external JS dependencies. Data persists in `localStorage` under the key `until_state_v1`. Use the reset button (bottom-left) to clear all saved data.

## Privacy

UNTIL collects nothing and sends nothing to any server it controls — there is no backend at all.

- **What's stored**: date of birth, life expectancy, habits, and milestones you enter — saved only in your browser's `localStorage`, under the key `until_state_v1`.
- **Where it goes**: nowhere. It never leaves your device, and there's no analytics, tracking, or logging of any kind.
- **The one external request**: Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`), to load the site's typefaces. Like any font or image load on any website, this exposes your IP address to Google as a normal side effect of the request — UNTIL itself doesn't send Google (or anyone) any of your data.
- **Clearing your data**: use the reset button (bottom-left of the site) at any time.

## Disclaimer

UNTIL is a visualization based on a life expectancy **you** choose — not a medical, actuarial, or scientific prediction of anything. It's intended for a general audience; there's nothing in it unsuitable for younger users, though the reflective/mortality-adjacent framing is aimed at teens and adults.

## Copyright

© 2026 Abejit. All rights reserved.

This project is shared publicly on GitHub for portfolio purposes. No license is granted to copy, modify, redistribute, or reuse this code or design — please don't recreate this project. If you'd like to use any part of it, get in touch first.
