# DriveQuest EU — Gamified EU Driving-Licence Academy

![Glaze](https://img.shields.io/badge/Glaze-0.14-364395)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-packs-003B57?logo=sqlite&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-full--3D-black?logo=three.js&logoColor=white)
![Python](https://img.shields.io/badge/Python-tooling-3776AB?logo=python&logoColor=white)
![Offline](https://img.shields.io/badge/offline-first-2E7D32)
![License](https://img.shields.io/badge/License-MIT-green)

CloudQuest-style 3D learning for the Category B driving licence. Theory-first,
fully offline macOS app (Glaze), built country-pack by country-pack.

**Status:** `eu` core pack (30Q) + `ro` pack (24Q + 10 fines) + SVG sign set.
CI green. No app code yet — see `docs/ARCHITECTURE.md` for the stack plan.

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
