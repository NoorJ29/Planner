# Tests

Browser tests using Playwright. Run them from the project root (the folder containing `index.html`).

## One-time setup
```
pip install playwright
python -m playwright install chromium
cd tests && mkdir -p libs && cd libs && npm init -y && npm i jspdf@2.5.1 jszip@3.10.1 quill@2.0.3 && cd ../..
```

## Run
1. Build and start a local server in one terminal:
   ```
   python3 build.py
   python3 -m http.server 8765
   ```
2. In another terminal, run any test:
   ```
   python3 tests/test_core_features.py
   ```
`libroutes.py` serves the editor, PDF and Word libraries from `tests/libs` so tests never download them.

Each test prints what it checked and ends with `ERRORS: []` when nothing went wrong. Screenshots go to `tests/out/`.

## What each test covers
- `test_core_features.py`: tasks, repeats, schedule drag, habits, notes, journal, PDF/Word export, money, goals, shopping, review, backup/restore, shortcuts, share target
- `test_two_device_sync.py`: phone + laptop syncing through a simulated Firebase (`mockfb2.js`)
- `test_links.py`: Links section, categories, open all, pop-up blocking, edit mode
- `test_guide_currency.py`: Guide page and currency picker
- `test_new_features.py`: smart quick add, focus timer, templates, countdowns, subscriptions, insights, home customisation, bottom bar, app lock
- `test_shared_and_calendar.py`: family shared lists (two users) and Google Calendar (`mockgis.js` simulates Google sign-in)
- `test_laptop_screens.py`: laptop layout screenshots
- `test_speed.py`: screen switch times with thousands of items
- `test_folders.py`: note folders and subfolders: create, open, breadcrumbs, include subfolders, move notes and folders, delete (keep or everything) with Undo, laptop tree, search, backup, sync
- `test_menu_layout.py`: choosing and ordering pages in the phone bottom bar and laptop sidebar, number keys, syncing the layout to another device
- `test_rich_notes.py`: note/journal formatting: toolbar, typing shortcuts, checkboxes, tables, links, colours in light and dark, paste and tampered-data safety, Word/PDF export, syncing, read-only offline view, size limit
- `test_attachments.py`: pictures and files in notes: resizing, splitting into parts, 5 MB limit, safe opening (HTML/SVG download only), paste, cleanup, other device, Word/PDF pictures, account deletion (needs `pip install pillow`)
- `test_profile.py`: profile button and page: stats, rename (also on shared lists), change password, sign out, delete account
- `test_home_layout.py`: Customise icon next to search (phone) and top right with hover label (laptop), one-line task rows on the phone Home
- `test_launch.py`: animated launch screen: shows in the installed app (or with ?launch=1), holds until the drawing finishes and the app is ready, tap to skip, reduced motion, never in a normal tab
- `test_install.py`: Install button on phone and laptop, real install prompt, per-browser steps (Android, iPhone, laptop), hidden inside the installed app
- `test_update_bar.py`: the "new version is ready" bar and Settings → Check for updates (serves its own copy of the app on port 8766)

The browser tests use their own test config, so your real `config.js` keys are never used. On Windows, set `PYTHONUTF8=1` (and build with `python3 -X utf8 build.py`).

## Security rules
`rules/rules.test.mjs` checks `firestore.rules` against Google's Firestore emulator (needs Java 21+ and Node):
```
cd tests/rules && npm install
npx firebase emulators:exec --only firestore --project demo-planner "node --test rules.test.mjs"
```
On Windows the emulator can keep running afterwards and hold port 8181; stop the leftover `java` process before the next run.

The simulations can't check real Google servers. Test sign-in and Google Calendar by hand after deploying.
