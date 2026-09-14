# CD comparison — curated RO pack vs ABC Auto bank

Date: 2026-09-14. CD: `ABCAutoB.sdf` (SQL CE 3.5, password in vendor
connection string, see INVENTORY.md), exported to 1,447 questions /
19 categories / 169 fines. Curated RO pack: 48 questions / 20 chapters /
10 fines. CD treated as co-equal source, not ground truth — both were
checked against the cited law articles.

## Method

1. Normalized (diacritic-stripped, stopword-removed) token overlap to rank
   CD candidates per curated question — scores too noisy for automated
   verdicts (paraphrased options), so used only for candidate ranking.
2. Manual adjudication of a stratified sample (6 questions, 6 chapters)
   against CD text + cited law article.
3. Exhaustive mechanical checks: chapter coverage, fines articles,
   explanation languages, multi-answer format parity.

## Findings

| Check | Result |
|---|---|
| Sample answer agreement (6/6 adjudicated) | AGREE — all match CD + law |
| Fines articles (art. 99/100/101/102) | all present in CD bank |
| Multi-answer format (CD has 102 `_a_c_`/`_a_b_c_`) | covered — 8 curated `multi` |
| RO explanations bilingual | FIXED — 2 gaps filled (see below) |
| Validator explanation-lang gate | ADDED — CI now rejects gaps |
| Chapter coverage | GAP — 6 chapters have 0 questions (see below) |
| CD explanations (`descriere_raspuns`) | null for all 1,447 — curated explanations are original work |

### Sample verdicts

- ro-prioritate-0001 (prioritatea de dreapta) — agrees with CD cat-7 set.
- ro-prioritate-0003 (roundabout) — agrees with CD#4415 (`_a_`).
- ro-depasire-0001 (no overtaking on crossings) — agrees with CD#4514 (`_a_c_`).
- ro-oprire-0001 (no stopping on crossings) — consistent with CD#4570 (`_b_`).
- ro-preventiva-0004 (night glare: right edge + slow) — standard rule.
- ro-depasire-0004 (unsigned intersections + level crossings) — agrees
  with CD#4514 + Regulament.

### Fixed in this batch

- `ro-depasire-0001`, `ro-oprire-0001`: added missing `explanation.ro`.
- `scripts/validate_packs.py`: explanation-language check (negative-tested).

### Known gaps (not bugs — starter-pack scope)

Chapters with zero curated questions: `eco` (CD cat 15, 15 Q),
`mecanica` (CD cat 16, 60 Q), `prim-ajutor` (CD cat 17, 61 Q),
`sanctiuni` (CD cat 18, 75 Q), `profesionale` (no CD counterpart),
`cat-e` (CD cat 19, 66 Q). The remaining 42 curated questions were
ranked against CD candidates but not individually adjudicated —
residual risk, full review on pack expansion.
