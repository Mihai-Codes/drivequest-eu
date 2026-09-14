# CD image mapping — status and rescue protocol

Date: 2026-09-14. Source: `setupABCAutoCategoriaB.exe` carved JPEG/PNG/BMP
blobs named from the EXE `AutoABC.data.*` string table in file order
(`scripts/extract_cd_images.py`, local `cd-extract/` — binaries stay out
of git; the map below is the committed record).

Status ledger: `cd-extract/image-map.json` (local working copy; a frozen
snapshot ships with this doc — see table). Per-stem statuses:

| Status | Count | Meaning |
|---|---|---|
| `verified-correct` | 3 | vision-confirmed vs CD question (9, 936, 1001) |
| `sampled-plausible` | 7 | stratified sample, scene matches question |
| `unverified` | 450 | photo-dimension file, not yet vision-checked |
| `dimension-suspect` | 50 | icon/button/menu dimensions — cannot illustrate its question |
| `proven-wrong` | 8 | vision-confirmed mismatch (2, 29, 58, 59, 105, 341, 589, 799) |

## What the forensics showed

- All 518 `nume_poza` stems resolve to a file ("102 missing" was a
  stencil error: 48 are `.png`/`.bmp`, not `.jpg` — all decode).
- Thumbnails are NOT downscales of the full stills (dHash min distance
  13/64) — separate assets, so no static cross-check exists.
- Storage order shows descending ID runs (936/933, 838/835/832…),
  consistent with genuine resource order, yet 8/20 vision-checked
  mappings are wrong (lesson screens, exam screenshots, submit buttons).
  Likely cause: vendor name reuse across modules (`58_start` as both a
  question still and a UI asset name) or vendor content bugs.
- Stratified 12-sample: 5 wrong, 7 plausible (~40% mismatch — do NOT
  treat `unverified` as correct).

## Rescue protocol (open work)

For each `proven-wrong` / `dimension-suspect` stem, match against the 212
`unknown_*` photo-dimension blobs (147× 540x380, 65× 160x120) by vision:
montage candidates per question, adjudicate scene-vs-text, record the
winner in `image-map.json`. Remaining `unverified` stems need the same
pass before any pack ships CD illustrations. No pack currently references
CD images, so nothing user-facing is affected.
