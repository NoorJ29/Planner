# Pictures and files in notes: design

Date: 2026-09-25. Part 3 of 3 of the notes upgrade (folders v13, rich text v15). The user asked for it to be built directly on the recommended approach.

## Storage
Cloud Storage for Firebase needs the paid Blaze plan, so attachments live in Firestore on the free plan:
- `users/{uid}/files/{id}`: details only: `{name, type, size, noteId, parts, w, h, createdAt}`. Cheap to list.
- `users/{uid}/files/{id}/parts/{0..n-1}`: `{d: base64}`, at most 700,000 characters each (Firestore's document limit is 1 MiB).
- Details and parts are written in **one batch**, so a file is never half-saved. Writes aren't awaited, so adding works offline.
- Existing rules cover it (`users/{uid}/**` owner-only). Files aren't in `COLS`: they're loaded when a note shows them, not synced wholesale.
- Limits: pictures are resized to a longest side of 1600 px and saved as JPEG (white behind transparency; GIFs kept as they are). Every file is capped at 5 MB after resizing.
- Attachments need sign-in (they live in the account). Signed out, the 📎 button explains that.

## In the editor
- Two new embeds, validated like everything else: `{pic:{id}}` (a block picture) and `{file:{id,name,size}}` (an inline chip "📎 name · 1.2 MB"). Ids must match `/^[a-z0-9]{4,32}$/`; names are cut to 200 characters and shown with `textContent`.
- The 📎 toolbar menu offers Picture or File. Pasting or dropping files into a note attaches them too; Quill's own image uploader is switched off.
- Tapping a picture opens it full size in a viewer sheet; tapping a file chip opens it.

## Opening files safely
Blob URLs share the app's origin, so file content must never run as a page:
- Pictures are only shown through `<img>` and only for JPEG, PNG, WebP and GIF. SVG counts as a file, not a picture.
- PDFs open in a new tab (the browser's PDF viewer).
- Everything else (including HTML) is **downloaded** with type `application/octet-stream`, never opened.

## Cleanup
`sweepFiles(noteId?)` deletes a file when its note is gone or no longer references it, and it's older than 10 minutes (so undo and a note being written aren't affected). It runs on closing a note (for that note, with no age limit, because closing ends that note's undo history), 20 s after startup, and 15 s after a note is deleted. Deleting the account deletes every file and its parts.

## Export
- PDF: pictures are drawn with `addImage` (re-encoded to JPEG through a canvas), scaled to the page width and at most 360 pt tall. File chips print as "📎 name" text (the paperclip is dropped by `pdfSafe`).
- Word: pictures are embedded as `word/media/imageN.jpeg` with inline drawings; file chips become text.

## Profile
Shows how much space pictures and files use: "Pictures and files: 12 (4.3 MB of about 1 GB free)".

## Tests (`tests/test_attachments.py`)
Adding a picture (shrunk, stored in parts, shown), adding a file and opening it, a >700 KB file split into parts, the 5 MB limit, HTML and SVG downloaded not opened, paste and drop, validation of tampered ids, cleanup after removing an attachment and after deleting a note, signed-out message, sync to a second device, Word and PDF include the picture, and account deletion removes files.
