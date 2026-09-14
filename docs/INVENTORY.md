# Recovered-corpus inventory (facts only, no question text)

Source: ABC Auto Categoria B MSI (LegislatieRutiera.ro SRL, Mar 2024 build) +
ABC auto CD (PROPHETIT GROUP v.3, Inno Setup 6). All Romanian. Extracted on
macOS: `msiextract` + `innoextract` + `boykopovar/sqlce` (cross-platform SDF
reader). MSI SDF password recovered from the app's own data-layer DLL
(`Auto.Utils.dll` connection string). CD SDF (`ABCAutoB.sdf`, SQL CE 3.5)
unlocked via `ilspycmd` decompile of the packed binary: connection string
at line 225 gave password `cucurucu`. CD treated as co-equal source, not
fallback (see overlap below).

## Combined syllabus (deduplicated on normalised text)

- MSI: 2,340 questions / 20 categories (no diacritics).
- CD: 1,447 questions / 19 categories (with diacritics ş/ţ) + **`amenzi`:
  169 fines** (`denumire, articol, amenda, puncte_penalizare, suspendare`)
  — fines table exists ONLY on the CD.
- Overlap: just 136 questions. **Combined unique ≈ 3,650 + 169 fines.**
- Both exported to local SQLite (`abc_ro.sqlite`, `abc_cd.sqlite`).

## MSI database: `intrebari_pregatitoare.sdf` (SQL CE 4.0)

| Table | Rows | Notes |
|---|---|---|
| `intrebari` | 2,340 | question bank |
| `categorii_intrebari` | 20 | theory chapters |
| `categorii_auto` | 5 | A, B, C, D, E |
| `setari`, `statistici`, `istoric` | 0 | runtime state (empty at rest) |
| `validare_autogest`, `LicenseKey` | 0 | licensing (dropped in port) |

Question row: `id, id_categ, text_intrebare, raspuns_a/b/c, raspuns_corect,
nume_poza, nume_animatie, id_categ_auto, pozitie, descriere_raspuns,
pozitie_orig`. Correct-answer key supports **multi-answer**
(`_a_`, `_a_b_`, `_a_b_c_` …) — quiz engine must handle multi-select.

## Census

- 2,340 questions across 20 categories (largest: Obligatiile conducatorilor
  auto 245, Prioritatea de trecere 242, Notiuni de mecanica 209).
- 2,162 with explanations (`descriere_raspuns`) — 178 without, must be
  authored, never backfilled from memory of the originals.
- 1,887 text-only (`nume_poza = 0`), 157 with JPG (all present on disk),
  **296 reference `.sqc` animation files not shipped in the MSI** — likely
  downloaded by the online licensing path. Edge case: ship these as
  text-only + redrawn SVG diagrams, never hotlink the vendor.
- 556 preparatory images + exam/button art recovered.

## Image coverage rule

JPG present → trace to SVG where it depicts a sign/scenario (signs are
Vienna-Convention geometry, safe to redraw); photo-realistic scenes get
re-shot/re-illustrated. Nothing bitmap-copied into the app.

## Local artifacts (NOT in repo)

- `vendor-msi/` (local Glaze project dir, never committed): `ABC-Auto-CategoriaB.Setup.msi`
  (vendor archive), `abc_ro.sqlite` (full MSI SDF export: 2,340 questions),
  `abc_cd.sqlite` (CD SDF export: 1,447 questions + fines), `msi-images/`
  (613 extracted images). Replaces the old `/tmp/dqdata/` + `/tmp/abc-msi/`
  working copies — do not rely on `/tmp`, it is wiped on reboot.
