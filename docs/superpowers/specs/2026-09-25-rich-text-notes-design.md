# Rich text for Notes and Journal: design

Date: 2026-09-25. Status: approved in chat, awaiting spec review.
Part 2 of 3 of the notes upgrade (1 folders: shipped in v13; 2 rich text: this doc; 3 attachments: later).

## Goal
Notes and journal entries get Word-style formatting: headings, bold/italic/underline/strike, colours and highlight, text sizes, alignment, bullet/numbered/checkbox lists with indentation, quotes, links, dividers and tables, plus typing shortcuts. Formatting syncs, survives backup/restore, and exports to Word and PDF.

Out of scope: images and file attachments (part 3), page layout (margins, columns, page breaks, headers/footers), custom fonts, real-time co-editing, formatting in shared family lists.

## Decisions
| Topic | Decision | Why / alternatives rejected |
|---|---|---|
| Editor engine | **Quill 2.0.3**, full build, from `cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.js` (not on cdnjs at 2.0.3) | Covers every format including checklists (`list: checked/unchecked`) and tables (`modules.table`: `insertTable`, `insertRowAbove/Below`, `insertColumnLeft/Right`, `deleteRow/Column/Table`), and has keyboard bindings with prefix matching. No build step. Tiptap/ProseMirror need bundling; a hand-built `contenteditable` editor is unreliable on Android. |
| Storage | `note.doc` = Quill Delta ops (JSON); `note.body` stays as a **plain-text mirror** (`quill.getText()`) | Delta holds only registered formats, so nothing executable is ever stored or injected. Keeping `body` keeps search, card previews, backups and older app versions working. Firestore accepts the ops array (array of maps, no nested arrays). |
| Toolbar | Our own toolbar (built with `h()`), no Quill theme toolbar | Matches the app's look; sticky above the phone keyboard. Quill runs with `theme: null` plus our CSS. |
| Journal | Same editor | One editor to learn. |
| Colours | Named palette stored as classes, not hex | Readable in light and dark themes via CSS variables. |

## Data model
- `note.doc`: `{ops:[...]}` Delta. Absent on legacy notes.
- `note.body`: plain text, always rewritten from the editor on save. Used by search, snippets, checklist progress fallback and legacy clients.
- `note.docSig`: a short fingerprint (32-bit FNV-1a hash, base36) of the plain text the `doc` produced when last saved, which avoids storing the text a third time. Detects edits made by an older app version: on open, if `doc` exists and `sig(note.body) !== note.docSig`, the note was edited as plain text elsewhere; load `body` as plain text (formatting reset) and show a toast: "This note was edited on an older version of the app, so its formatting was reset."
- Legacy notes (no `doc`): opened by converting `body` to a Delta (one line per `\n`). `doc` is only written after the first edit.
- Journal entries (`type:"journal"`): identical fields.
- Size guard: on save, if `JSON.stringify(note).length > 800_000`, don't save; show "This note is too big to sync. Split it into two notes." (Firestore's hard limit is 1 MiB.)

## Allowed formats (the whitelist)
Passed to Quill's `formats` option, so pasted content can only carry these:
- Inline: `bold`, `italic`, `underline`, `strike`, `link`, `color`, `background`, `size`.
- Line: `header` (1–3), `list` (`ordered`, `bullet`, `checked`, `unchecked`), `indent` (1–8), `blockquote`, `align` (`center`, `right`, `justify`), `table` (via table module).
- Embed: `divider` (custom `BlockEmbed`, renders `<hr>`).
- `color`: class attributor, values `red orange green blue purple grey`. `background`: class attributor, values `yellow green blue pink orange`. `size`: class attributor, values `small large huge`. `align`: class attributor.
- `link`: override `Link.sanitize`: allow `http:`, `https:`, `mailto:` only; bare domains get `https://`; anything else is rejected (link not applied, toast "Only web and email links are allowed.").
- Not allowed: images, video, formulas, code blocks, fonts, sub/superscript, direction.

`validateDoc(doc)` runs on every load (cloud, local, backup restore): keeps only ops whose `insert` is a string or `{divider:true}`, drops attributes not in the whitelist or with values outside the allowed sets, and caps at 200k ops. Invalid docs fall back to `body`.

## Loading and offline
- `loadEditor()` loads Quill via `loadScript()`; the promise is cached.
- **Prefetch:** after startup, when online and idle (`requestIdleCallback`, 4 s fallback), call `loadEditor()` so the service worker caches it.
- `sw.js`: add `cdn.jsdelivr.net` to `CDN` (cache-first like cdnjs).
- **Fallback:** if Quill can't load, the note opens **read-only**, rendered from the Delta with `h()`/`textContent` (never `innerHTML`), with the banner "Formatting tools need the internet once. You can read this note now; editing will work when you're back online."

## Editor UI
- `editorSheet` gets a `rich:true` mode, used by `openNote` and `openJournal`. Title input, pin and folder chips stay as they are.
- **Toolbar** (one row, horizontal scroll on phone, wraps on laptop; `position:sticky;bottom:0` inside the sheet, lifted above the on-screen keyboard using `visualViewport`): undo, redo | style menu (Normal, Heading 1–3) | B I U S | text colour ▾, highlight ▾ | bullet, numbered, checklist | outdent, indent | quote | align ▾ | size ▾ | link | divider | table ▾ | clear formatting.
- Buttons get `aria-pressed` from `quill.getFormat()` on `selection-change` and `text-change`.
- Table menu: when the cursor is outside a table, "Insert table (3×3)"; inside a table: add row above/below, add column left/right, delete row, delete column, delete table.
- Checklist: tapping the box toggles `checked`/`unchecked` (Quill's built-in behaviour). Checked items: muted and struck through (CSS).
- Links: the link button opens a small sheet (address input, Save, Remove). Links in the editor open in a new tab with `rel="noopener noreferrer"`.
- **Keys:** Ctrl+B/I/U (built in), Ctrl+K link, Ctrl+Z / Ctrl+Y and Ctrl+Shift+Z (history), Ctrl+Shift+7/8/9 numbered/bullet/checklist, Ctrl+Alt+1/2/3 headings, Ctrl+Alt+0 normal text, Tab / Shift+Tab indent in lists.
- **Typing shortcuts** (via `keyboard.addBinding` with `prefix` and `offset`): at line start `# `, `## `, `### ` headings; `- `, `* ` bullet; `1. ` numbered; `[] `, `[ ] `, `[x] ` checklist; `> ` quote; a line that is exactly `---` followed by Enter becomes a divider. Inline: `**text**` bold, `*text*` italic, `~~text~~` strike, converted when the closing marker is typed (`text-change` handler, user source only).
- Saving: debounced 600 ms like today, writing `doc`, `body`, `docSig` and `updatedAt`. The "Saving… / Saved" status stays.
- **Note cards:** unchanged plain-text snippet from `body`. If the doc has checklist lines, show "☑ done/total" in the card footer.
- Guide page: a "Formatting notes" section listing the shortcuts.

## Security
- No `innerHTML` with note content anywhere. The editor receives Delta via `setContents`; the read-only fallback and exports walk ops.
- Format whitelist plus `validateDoc` on load: a tampered doc or backup can't add scripts, images, event handlers or unknown attributes.
- Paste goes through Quill's clipboard to a Delta, then the format whitelist; `<script>`, `<img onerror>`, `<iframe>`, `style`, `javascript:` URLs are dropped.
- The link sanitizer allows only http, https and mailto.
- Firestore rules: unchanged (`users/{uid}/**` owner-only).

## Export
A shared converter `docToBlocks(note)` turns a Delta (or legacy `body`) into a list of blocks:
`{kind: "p"|"h1"|"h2"|"h3"|"li"|"quote"|"hr"|"table", list?: "bullet"|"ordered"|"checked"|"unchecked", indent, align, runs:[{text,b,i,u,s,color,bg,size,link}], rows?: [[cellRuns]]}`.

- **Word (`makeDocx`):** adds `word/styles.xml` (Normal, Heading1–3, Quote), `word/numbering.xml` (one bullet and one decimal abstract numbering, 9 levels; each numbered list restarts), and `word/_rels/document.xml.rels` for hyperlinks. Runs map to `w:b`, `w:i`, `w:u`, `w:strike`, `w:color`, `w:highlight` (nearest Word highlight colour), `w:sz`. Checklist items are paragraphs starting with ☐ / ☑. Dividers are paragraphs with a bottom border. Tables are `w:tbl` with single borders. Alignment is `w:jc`. `[Content_Types].xml` gains the new parts.
- **PDF (`makePdf`):** a block layout on jsPDF: heading sizes 20/16/13.5 pt; helvetica normal/bold/italic/bolditalic; underline and strike drawn as lines; text colour; highlight as a filled rect behind the run; bullets •, numbers, drawn checkboxes; indent 18 pt per level; quote with a left bar; divider line; tables as a ruled grid with wrapped cell text; links via `doc.link`; alignment. `pdfSafe` stays (Latin-only note unchanged).
- Journal export uses the same path.

## Files touched
- `src/editor.js` (new): `loadEditor`, format registration (divider, class attributors, link sanitizer), `validateDoc`, `deltaFromText`, `renderDocReadOnly`, toolbar, key and typing bindings, `docToBlocks`.
- `build.py`: add `editor.js` to the file list, after `habits_notes.js`. This is the one change outside `src/`.
- `src/habits_notes.js`: `editorSheet` rich mode, `openNote`/`openJournal` save fields, card checklist progress, `makePdf`/`makeDocx` rewritten on blocks.
- `src/main.js`: idle prefetch. `src/more.js`: Guide section. `src/style.css`: editor, toolbar, palette and checklist styles.
- `sw.js`: CDN list, version bump.
- `tests/libs`: add `quill@2.0.3`. Tests route jsDelivr to the local copy (as done for jspdf/jszip).

## Testing
New `tests/test_rich_notes.py` (Playwright, simulated Firebase):
1. Each toolbar action applies the right format (checked via `quill.getContents()`), and `aria-pressed` reflects the cursor.
2. Every typing shortcut, block and inline.
3. Checkbox tick toggles and styles; indent/outdent; table insert plus every row/column action.
4. Colours: classes applied; computed colours differ between light and dark theme and meet a 3:1 contrast minimum against the note background.
5. Close and reopen keeps the formatting; a second device sees it; backup then restore keeps it.
6. A legacy plain-text note and journal entry open, edit and save (`doc` created, `body` updated); search finds text inside formatted notes; card previews and checklist progress are right.
7. Old-version edit detection: change `body` in storage so its fingerprint no longer matches `docSig`, reopen, and the body text wins, with the toast.
8. Security: paste HTML containing `<script>`, `<img src=x onerror>`, `<a href="javascript:...">`, and inline `style`; assert no dialog or script ran and the stored doc has no disallowed ops or attributes. A tampered stored doc (unknown attrs, image insert) is cleaned by `validateDoc`. The link button rejects `javascript:`.
9. Offline fallback: block jsDelivr, open a note, and it renders read-only with the banner and no edits possible.
10. Export: unzip the .docx and assert `Heading1`, `w:numPr`, `w:tbl`, `w:b`, a hyperlink relationship and ☑; the PDF blob is non-empty and contains the note text (via `pdf.js`-free check: `%PDF` header and text in content streams, uncompressed with `compress:false` in test mode).
11. Size guard: a >800 KB note shows the warning and isn't written.
Plus the full existing suite.

## Rollout
One release (v15), service worker bump; users get the update bar. No rules change. Older app versions still read and edit `body` (formatting resets on those edits, detected as described above).
