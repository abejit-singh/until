# UNTIL.

**You don't have forever.**

UNTIL is a single-page, interactive visualization of your life: how much of it you've lived, how much you may have left, and what your daily habits are quietly costing you in years.

No backend, no build step, no dependencies to install. Everything runs client-side and saves to your browser's `localStorage`.

## Live features

- **Your life.** Age in years and months, weeks lived and remaining, days lived, years remaining and the share of your chosen lifespan already lived.
- **Your life in weeks.** A generated grid with one square per week and one row per year of age. The current week is highlighted, and hovering or tapping any square shows the date it represents.
- **Habit calculator.** Turn daily hours (sleep, work, social media, etc.) into years of your life, shown as bars.
- **What If.** Drag a slider to see how many years and hours you'd get back by changing a habit. It never suggests sleeping less than 7 hours.
- **Milestones.** Future goals with dates, shown in order on a timeline.
- **Make Today Count.** A closing, reflective screen with a random prompt.

All numbers are computed live from the date of birth and life expectancy you enter. Nothing is hardcoded or simulated.

## How the numbers are calculated

| Figure | Formula |
| --- | --- |
| Age | calendar years and months since your date of birth |
| Weeks lived / remaining | whole 7-day weeks from your birth to today, and from today to the day you turn your chosen life expectancy |
| Life elapsed | days lived ÷ days from birth to that day |
| Grid | 52 squares per row, one row per year of age. This week's square sits at row = your age, column = weeks since your last birthday. |
| Habit in years | hours per day ÷ 24 × life expectancy |
| What If | hours saved per day ÷ 24 × years remaining |

## Running it locally

No installation required.

1. Download `index.html`.
2. Open it in any modern browser (double-click, or drag it into a browser window).

An internet connection is used only to load Google Fonts (Inter, Space Grotesk, JetBrains Mono) on first load. Everything else works offline.

## Installing as an app (PWA)

UNTIL is a Progressive Web App. Once it's hosted over HTTPS (for example on GitHub Pages), you can install it like a native app, with its own icon (a "U." monogram matching the site's wordmark) and offline support.

- **On mobile:** open the site, then use your browser's "Add to Home Screen" option (Safari: Share → Add to Home Screen; Chrome: menu → Install app).
- **On desktop:** Chrome and Edge show an install icon in the address bar.

When you're online the page is always loaded fresh, so updates appear immediately. The saved copy is only used offline. The install prompt and offline mode only activate over HTTPS. Opening `index.html` directly from disk (`file://`) works for everything else.

## Privacy

UNTIL collects nothing and sends nothing to any server it controls. There is no backend at all.

- **What's stored:** your date of birth, life expectancy, habits and milestones. They are saved only in your browser's `localStorage`, under the key `until_state_v1`.
- **Where it goes:** nowhere. It never leaves your device. There's no analytics, tracking, cookies or logging of any kind.
- **The one external request:** Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`), to load the site's typefaces. Like any font or image load on any website, this exposes your IP address to Google as a normal side effect of the request. UNTIL itself doesn't send Google, or anyone, any of your data.
- **Security:** a Content Security Policy blocks any outside script or connection. All text you type is escaped before it is displayed, and saved data is validated every time it loads.
- **Clearing your data:** use the reset button (bottom-left of the site) at any time.

## Tech

Vanilla HTML, CSS and JavaScript in a single, fully commented file. No frameworks, no build tools, no external JavaScript.

| File | Purpose |
| --- | --- |
| `index.html` | The whole app: markup, styles and script |
| `manifest.json` | App name, colours and icons for installation |
| `service-worker.js` | Offline support and instant updates |
| `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `favicon-32.png` | App icons |

## Disclaimer

UNTIL is a visualization based on a life expectancy **you** choose. It is not a medical, actuarial or scientific prediction of anything. It's intended for a general audience: there's nothing in it unsuitable for younger users, though the reflective, mortality-adjacent framing is aimed at teens and adults.

## Copyright

© 2026 Abejit. All rights reserved.

This project is shared publicly on GitHub for portfolio purposes. No license is granted to copy, modify, redistribute or reuse this code or design. Please don't recreate this project. If you'd like to use any part of it, get in touch first.
