# DriveQuest EU — Gamified EU Driving-Licence Academy

CloudQuest-style 3D learning for the Category B driving licence. Theory-first,
fully offline macOS app (Glaze), built country-pack by country-pack.

**Status:** scaffold + recovered-corpus inventory. No app code yet.

## The loop (inspired by CloudQuest, reskinned for roads)

Avatar learner → instructor NPC hands you a scenario ("your friend failed on
priority intersections") → 2-minute micro-lesson → guided quiz (Scripted mode)
→ DIY exam sim (Open mode) → a district lights up on your licence map + badge.
Weekly exam-sim tournaments. Duolingo-grade retention underneath (streak, XP,
hearts, per-topic Legendary, cracked-topic repair).

## Repo layout

- `docs/` — architecture, game design, content pipeline, market decision, inventory
- `content/packs/_template/` — country-pack format (JSON schema-validated)
- `scripts/` — `export_sdf.py` (local-only corpus recovery), `validate_packs.py`
- Corpus (2,340-question recovered bank, images) is **never committed** — see
  `docs/INVENTORY.md`. It is a syllabus map, not shippable content.

## Country packs

Engine is country-agnostic. Launch order: **RO first** (we hold the syllabus
map), **DE second** (official Fragenkatalog exists + exam offered in English),
shared **Vienna-core** pack (signs/signals per the 1968 Convention) underneath
all. Rationale in `docs/MARKET.md`.

## Legislation freshness

Every pack carries `lawValidThrough` + source links. CI fails when a pack is
stale (>12 months). In-app "legislation current as of" label. Yearly review
workflow in `docs/CONTENT-PIPELINE.md`.

## Disclaimer

Unofficial study aid. Not affiliated with DGPCI/DRPCIV, TÜV/DEKRA, or any
exam authority. Questions are original, aligned to public law — never copied
from any commercial bank.
