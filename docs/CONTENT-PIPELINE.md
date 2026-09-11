# Content pipeline

1. **Map**: recovered bank ⇒ chapter weights + topic list (INVENTORY.md).
2. **Draft**: original EN questions per chapter, each with `article` (law
   citation), `explanation`, `difficulty`, `media` (SVG id or null).
3. **Localise**: RO text alongside EN from the start (RO pack ships bilingual).
4. **Review gates**: law-article check → native-speaker terminology pass →
   schema validation (`validate_packs.py`) → playtest.
5. **Version**: packs carry `packVersion`, `lawValidThrough`, `sources`.
   Breaking law change ⇒ minor release + What's-new line.

## Pack JSON (see `_template/`)

`pack.json`: meta, examFormat, chapters[], questions[] (id, chapter,
type single|multi, stem{}, options{}, correct[], explanation{},
media, article, difficulty 1–3). `validate_packs.py` enforces: ids unique,
correct ⊆ options, multi has ≥2 correct, every question has article +
explanation, `lawValidThrough` fresh.

## Terminology review

Seed from DE official EN exam wording + UK Highway Code; all EN strings
tagged `review:terminology` until a native speaker signs off. Reviewers
sourced online first (driving-instructor forums, EN-exam guide authors),
in-person handoff supported: export `content/packs/<cc>/review.csv`.
