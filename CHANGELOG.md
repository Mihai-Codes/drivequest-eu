# Changelog

All notable changes to the DriveQuest EU app and content packs are
documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versions follow [SemVer](https://semver.org/) starting at 0.1.0.

## [Unreleased]

### Added

- Gamification audio: distinct UI click sounds (Kenney CC0 Interface Sounds)
  on primary CTAs, ghost buttons and toggles; a garage ambient bed —
  "Another August" by cynicmusic (CC0) — on the landing screen that fades
  out when the learner enters a lesson. Sound toggles added to Settings;
  persisted via new `sound-prefs` IPC handlers. Credits in
  `sources/renderer/main/assets/audio/CREDITS.md`.

### Changed

- Garage v3 composition: the floating "Start learning" CTA removed — the
  recommended bay card now carries the entry action (gold ring + "Next up"
  strip with the chapter name); reserved slot uses a blank dealer plate;
  Euro-plate headline text optically re-centred (letter-spacing trailing
  gap cancelled, cap-height nudge, pixel-measured).
- Cards adopt Liquid Glass material cues (WWDC25): adaptive translucent
  surface, specular top edge, lensing inner ring; stats set in SF Pro
  Rounded (`ui-rounded`); type system capped at three platform faces
  (SF Pro, SF Pro Rounded, DIN Condensed for plates only).

## [0.2.0] — 2026-10-10

### Added

- Garage landing redesign: full-bleed European dusk-garage hero (AI-rendered
  WebP), Euro-plate brand headline with 12-star band and DIN Condensed
  characters, garage-shutter loading state.
- Progress-aware entry: "Start learning / Continue training" opens the
  learner's actual next chapter (`resumeStep` / `firstUnmastered` in
  `progress.ts`); card CTAs are destination-aware Start/Continue.
- Redrawn steering-wheel icon per pack (T-spoke, hub emblem, square aspect).
- Repo banner (`assets/banner.webp`) and this changelog.

### Changed

- Landing composition per Apple HIG / Adobe Spectrum 2 research: one scene,
  local scrims, single primary CTA, integrated card footers.
- Copy: "Fully offline · No account needed" removed; misleading "DRIVE"
  replaced by destination-named actions; "BAY/showroom" jargon dropped.
- Glaze SDK 0.14.2 → 0.14.3 sync; repo-wide prettier reflow (formatting only).

### Fixed

- `renderer/preload.ts` eslint `no-undef` failure (disable directive sat one
  line above a multi-line condition).

## [0.1.0] — 2026-10-01

### Added

- European Core pack (`eu`): 30 questions, 10 chapters, Vienna Convention
  sign set, exam format 26Q/30min/22-pass.
- Romania pack (`ro`): 781 questions aligned to the official DGPCI/DRPCIV
  bank (733 official questions folded in), 20 chapters, statute-quoted
  explanations, EN + RO localization, 10 fines.
- Glaze macOS app: garage landing, licence map, chapter flow (Learn →
  Practice → Test), results review with article-cited explanations, Quick
  Challenge; XP/streak/hearts/mastery persisted locally.
- Pack validation (`scripts/validate_packs.py`) with CI, law-freshness
  gating (warn 10 months, fail 12) and JSON schema template.