# Game design v0

## Core loop (CloudQuest reskin)

1. **Garage** (avatar + licence map: dark districts per chapter).
2. **Briefing**: instructor NPC frames a scenario, never a question list.
3. **Micro-lesson**: one rule, one diagram, one article citation (~2 min).
4. **Guided run** (Scripted, SimuLearn-style): quiz with hint-tutor ("Dr. Newton"
   equivalent: a driving instructor who Socratic-hints, never answers).
5. **DIY exam sim** (Open): real format, real timer, no hints.
6. **Payoff**: district lights up, badge, XP; fail → cracked-district repair
   (Duolingo repair loop).

## Scenario tasks (inspired by SimuLearn)

- **Incomplete-diagram**: half-drawn intersection, place priority order.
- **Customer-job**: "get this delivery across town legally" — route + rule
  choices with consequences, not trivia.
- **Spot-the-violation** clips (phase 2): click the hazard.

## Retention (Duolingo mechanics, minimal set)

Streak (honest, no streak-freeze shop), XP per unique-first-correct,
hearts in DIY sim only (3, refill daily — exam pressure without grind),
Legendary per chapter (5 levels), milestones 10/50/100, weekly tournament
(exam-sim leaderboard, local-first for now).

## Modes

Learn (Scripted) / Exam sim (Open) / Repair (cracked topics) / Tournament.
Motion toggle + sound-per-surface carried over from Longman standards.

## Design references (October 2026)

Primary north star: **AWS Card Clash** — AWS's free 3D card game where players
deploy service cards into missing slots of real architecture diagrams
([product](https://aws.amazon.com/training/digital/aws-card-clash/),
[mobile announcement](https://aws.amazon.com/blogs/training-and-certification/introducing-aws-card-clash-mobile-learn-aws-architecture-through-strategic-gameplay/),
[independent walkthrough](https://dev.to/aws-builders/aws-card-clash-an-architecture-design-game-o7f)).
Its learning loop — inspect a real artefact, choose the right card, pay for
mistakes, score per round, stars per level, learning paths — maps 1:1 onto
traffic-scenario rounds. This replaces the earlier CloudQuest framing:
Card Clash is a card/table abstraction we can honour in 2D, not a 3D city we
would have to build.

Studio grounding (chosen for documented, transferable practice):

- **Rockstar Games** — the world keeps communicating when no task is active:
  authored ambience, environmental storytelling, persistent social hubs
  (GDC: [RDR2 wildlife systems](https://gdconf.com/article/learn-how-rockstar-breathed-life-into-the-wildlife-of-red-dead-redemption-2-at-gdc/),
  [environment as visual storytelling](https://gdcvault.com/play/1027254/Environment-Design-as-Visual-Storytelling)).
  Applied here: the garage is a place, not a menu.
- **Nintendo EPD** — teach one mechanic at a time: introduce, complicate,
  twist, demand mastery (Miyamoto on World 1-1; Hayashida on kishōtenketsu
  level structure — [Game Developer](https://www.gamedeveloper.com/design/the-secret-to-i-mario-i-level-design)).
  Applied: Learn → Practice → Test per chapter.
- **Polyphony Digital (GT7 Licence Centre)** — small isolated skill tests,
  transparent criteria, graded medals, capstone exam per tier, rewards at
  thresholds ([manual](https://www.gran-turismo.com/us/gt7/manual/license/01)).
  Applied: chapter stars + mastery gating + exam formats.
- **Apple HIG / Adobe Spectrum 2 / Linear & shadcn craft** — one attention
  group per screen, local scrims over photography instead of full-frame dim,
  semantic type scale, single primary CTA, visible focus states
  ([materials](https://developer.apple.com/design/human-interface-guidelines/materials),
  [Spectrum 2 attention hierarchy](https://spectrum.adobe.com/foundations/attention-hierarchy)).
  Applied: garage landing composition rules.

## Vocabulary

- The landing is **the garage**; the two curricula are its bays; the brand
  mark is a Euro plate. Copy never says "showroom".
- Learning is never "DRIVE"; buttons name their destination
  (Start/Continue + chapter context).
