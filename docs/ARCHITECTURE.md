# Architecture

## Engine (country-agnostic)

- **Glaze macOS app**, renderer in React + Tailwind (Longman pattern).
- **Pack loader**: versioned JSON packs (`content/packs/<cc>/`), schema in
  `content/packs/_template/schema.json`, validated by
  `scripts/validate_packs.py` and CI.
- **Quiz engine**: single/multi-select, per-exam-format drivers
  (`questionCount`, `timeLimitSec`, `passMinCorrect`, `maxWrong`), seeded
  shuffle, review mode with article-cited explanations.
- **Save**: streak/XP/hearts/mastery in `app.getPath("userData")`, never repo.

## Rendering tiers (GPU decision)

- **Lite (default)**: 2.5D isometric SVG/canvas districts + illustrated
  scenarios. Runs everywhere, zero WebGL risk.
- **Full 3D (opt-in)**: Three.js city that grows per completed module
  (CloudQuest payoff). Capability-detected (`WebGL2` + deviceMemory +
  fps-probe on first launch); auto-falls-back to Lite with a one-line note.
  No keyboard driving in v1 — hazard-perception clips (click-the-hazard)
  only, phase 2.

## Law-pack freshness

Each pack: `lawValidThrough` (YYYY-MM), `sources[]` (URLs to code text),
`examFormat` snapshot. `validate_packs.py` warns at 10 months, CI fails past
12. Yearly review: diff national code changelogs → patch packs → minor
release ("legislation current as of …" label in-app + store What's-new).

## No-ports from the originals

MySQL phone-home licensing, `LicenseKey`/`validare_autogest` tables, WMP
audio (→ HTML5), `.sqc` animations (→ SVG/CSS), SQL CE runtime (→ SQLite /
JSON packs).
