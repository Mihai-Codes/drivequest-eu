<p align="center">
  <img src="assets/banner.webp" alt="DriveQuest EU — the European driving academy" width="100%">
</p>

<h1 align="center">drivequest-eu</h1>

<p align="center">
  <a href="https://github.com/Mihai-Codes/drivequest-eu/releases"><img alt="Release" src="https://img.shields.io/github/v/release/Mihai-Codes/drivequest-eu?color=003399&labelColor=1b222c"></a>
  <a href=".github/workflows/verify.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/Mihai-Codes/drivequest-eu/verify.yml?label=packs%20CI&labelColor=1b222c"></a>
  <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-2b3542?labelColor=1b222c"></a>
</p>

<p align="center">
  <a href="#how-learning-works">How learning works</a> ·
  <a href="#releases">Releases</a> ·
  <a href="https://github.com/Mihai-Codes/drivequest-eu/issues/1">Roadmap</a>
</p>

A gamified macOS study companion for the Category B driving licence, built
country-pack by country-pack and fully offline. The design brief is
**AWS Card Clash, not CloudQuest**: short, self-contained game rounds where
you *deploy the right rule into a real traffic situation* — the way Card
Clash has you deploy service cards into real architecture diagrams — wrapped
in a European garage that treats learning like preparation for the road.

## How learning works

Each curriculum plays as rounds of increasing responsibility, in the spirit
of [AWS Card Clash](https://aws.amazon.com/training/digital/aws-card-clash/):

| Card Clash | DriveQuest EU |
|---|---|
| An architecture diagram with missing slots | A traffic scenario with a missing rule |
| Deploy the right **service card** into the slot | Deploy the right **rule/sign card** into the situation |
| Wrong placement costs energy; special cards defend | Wrong placement costs a heart; article-cited explanations teach |
| Stars + quality score per level | Stars (1–3) per chapter, mastery unlocks the next |
| Learning paths (Practitioner → Architect) | Curricula: **European Core** foundation → **national** packs |

Underneath: Duolingo-grade retention (streak, XP, hearts, per-chapter
Legendary) and GT-style licence framing — every chapter is a licence test
with transparent criteria, a personal best and graded medals.

The interaction design is grounded in documented practice from Rockstar
Games (world as a persistent, authored place), Nintendo EPD (teach one
mechanic at a time, mastery through play), Polyphony's GT Licence Centre,
Apple HIG and Adobe Spectrum 2 — with sources and the mapping in
[docs/GAME-DESIGN.md](docs/GAME-DESIGN.md).

## The app

Native macOS (Glaze), React 19 + Tailwind 4 + TanStack Router, five screens:
the garage landing, licence map, chapter flow (Learn → Practice → Test),
results review and Quick Challenge. Progress (XP, streak, hearts, mastery)
is stored locally in `userData` — there is no account and no backend, and
the UI doesn't need to say so.

| | |
|---|---|
| **European Core** | Foundation curriculum: Vienna Convention signs and rules every EU country shares. 30 questions, 10 chapters. Expansion tracked on the roadmap. |
| **Romania** | National curriculum: 781 questions aligned to the official DGPCI/DRPCIV bank, 20 chapters, statute-quoted explanations, EN + RO. |

## Country packs

Packs are versioned JSON under [`content/packs/`](content/packs) — they are
the database. A [JSON schema](content/packs/_template/schema.json),
[`scripts/validate_packs.py`](scripts/validate_packs.py) and CI enforce IDs,
localization, answer keys, citations, media presence and law freshness
(warn at 10 months, fail past 12). Engine is country-agnostic; launch order
is **RO first, DE second** (rationale in [docs/MARKET.md](docs/MARKET.md)).

**Scheduled review — Q4 2026:** Vienna Convention amendments enter into
force **12 November 2026**; the `eu` pack gets reviewed against the amended
text then (see the roadmap).

## Repo layout

```
assets/            banner + artwork for this README
content/packs/     versioned country packs (the database) + schema template
docs/              architecture, game design, content pipeline, market, inventory
scripts/           pack validation + CD extraction toolchain (local-only corpus)
sources/           the Glaze app (main + renderer); public/packs symlinks to content/
.github/workflows/ pack-validation CI
```

App sources live in [`sources/`](sources), a Glaze project; the macOS app
itself is built with `npm run verify` inside that project. Live development
happens in the sibling Glaze project folder and syncs into this repo —
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) documents the exact flow and
gates.

## Releases

Semantic versioning, starting at `v0.1.0` (we ship working software from the
first tag; `0.x` signals an app still finding its shape). Every release has
notes in the [releases page](https://github.com/Mihai-Codes/drivequest-eu/releases).
Content-pack versions (`packVersion` inside each pack) evolve independently
of app releases.

## Legislation freshness

Every pack carries `lawValidThrough` + source links. In-app labels and CI
keep packs honest; the yearly review process is in
[docs/CONTENT-PIPELINE.md](docs/CONTENT-PIPELINE.md).

## Disclaimer

Unofficial study aid. Not affiliated with DGPCI/DRPCIV, TÜV/DEKRA, AWS or
any exam authority. Questions are original or sourced from public official
banks, aligned to public law — never copied from any commercial bank.