# Planner: developer notes (for Claude Code or any developer)

## What this is
A single-page installable web app (PWA) hosted on GitHub Pages, with optional sync through Firebase (Auth + Firestore) and optional Google Calendar access. No build tools or frameworks: plain JavaScript and CSS.

## Files
- `src/` holds the **source**. Edit these, never `index.html` directly.
  - `shell.html`: page skeleton (sidebar, dock, script/style placeholders)
  - `style.css`: all styles (theme tokens at the top, laptop layout under `min-width:1000px`)
  - `core.js`: helpers, state (`D`, `SET`, `UI`), sheets, sync `Store`, notifications
  - `plan.js`: tasks, editor, week/month calendar, day/schedule/upcoming/lists
  - `habits_notes.js`: habits, notes, journal, PDF/Word export
  - `more.js`: money, goals, shopping, weekly review, backup, settings, guide, More menu, search
  - `links.js`, `smart.js` (quick-add parser), `focus.js`, `extras.js` (subscriptions, countdowns, templates), `insights.js`, `lock.js`, `shared.js` (family lists), `gcal.js` (Google Calendar), `home.js` (dashboard, bottom-bar choice)
  - `main.js`: render loop, navigation, keyboard shortcuts, startup
- `build.py` joins `src/` into `index.html`. The order of files matters (`main.js` last).
- `sw.js`: service worker (offline cache). **Bump `VERSION` every release** so phones update.
- `manifest.webmanifest`: install info, quick-action shortcuts, share target
- `config.js`: Firebase config and optional Google client ID (per user, safe to publish)
- `firestore.rules`: security rules; paste into Firebase after changing
- `tests/`: Playwright tests (see `tests/README.md`)

## Data model (Firestore)
- `users/{uid}` holds settings (lists, categories, budget, currency, linkCats, dashboard).
- `users/{uid}/{tasks|habits|notes|folders|goals|expenses|shop|links|focus|subs|countdowns|templates}/{id}` holds one document per item. Note folders are `{name,parentId,color}`; a note's `folderId` points at one ("" means top level).
- `shared/{listId}` (+ `items/`) holds family lists; `invites/{code}` holds join codes.

Without Firebase config, everything is stored in `localStorage` (`planner.v2`).

## Workflow
1. Edit files in `src/`.
2. `python3 build.py`
3. Test locally: `python3 -m http.server 8765`, open http://localhost:8765, and run the tests.
4. Bump `VERSION` in `sw.js`.
5. Commit and push to the GitHub repo; GitHub Pages redeploys in about a minute.

## Conventions
- UI text: plain, friendly English, no jargon. Buttons say exactly what they do.
- Every destructive action offers Undo (`undoable()`) unless it affects other people.
- Keep screens fast: `render()` batches with requestAnimationFrame; big lists are capped with "Show all".
