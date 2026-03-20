# Product Strategy

## What LEARN-X is

A **learning operating system** that turns course materials into adaptive mastery.

The core insight: students aren't failing because they lack access to information. They're failing because the tools they use — note-taking apps, AI chatbots, flashcard apps, calendars — don't talk to each other and have no memory of how the student learns.

LEARN-X replaces a 5-tool stack (NotebookLM + Anki + Quizlet + Notion + calendar) with one platform that knows the student, knows their material, and knows what they need to study next.

---

## Positioning

**For:** University students and lifelong learners who study from their own course materials

**Against:** Fragmented AI study stacks

**Claim:** The only platform that combines source-grounded AI, FSRS spaced repetition, adaptive assessments, mastery tracking, and identity-based explanation framing in one place

**One-liner:** _LEARN-X turns your course materials into a learning system that adapts to how you think — not just what you know._

**The deeper claim:** LEARN-X teaches using what the learner already connects with. If a student understands the world through basketball, finance, music, or gaming, LEARN-X uses those frames to make hard concepts click faster — without sacrificing rigor.

### What we are NOT

- Not an AI notebook (NotebookLM's lane)
- Not a flashcard app (Anki/Quizlet's lane)
- Not an AI tutor (Khanmigo's lane)
- Not a note-taking app

The moment we position as any of these, we lose. We win by being the thing that replaces all of them.

---

## Competitive Analysis

### NotebookLM (Google) — Highest-priority watch

**Current feature set (March 2026):** Source-grounded chat, Audio Overviews (Deep Dive / Brief / Critique / Debate formats, Interactive Mode added late 2025), flashcard and quiz generation, mind maps, slide deck export, Google Classroom integration for teachers. 80K+ organizations. Free tier with paid Plus/Pro.

**What it still cannot do** (structural, not fixable with an update):

- No mastery tracking or FSRS — flashcards are generated but never scheduled
- No concept graph — siloed notebooks with no cross-document knowledge connections
- No adaptive lesson sequence — no concept-level gap detection, no "what to study next"
- No LMS grade passback — Google Classroom integration is read-only source assignment, not LTI with grade sync
- No professor/instructor dashboard or student roster management
- No formal timed exam mode, no sharing with grade passback
- 50 sources per notebook — constrains large-course use cases
- Audio is a consumption experience, not a learning input — no quiz interruptions, no spaced repetition from audio

**The viral moment context:** Audio Overviews drove a 371% traffic spike in Sept 2024. This set user expectations for the category. LEARN-X must have audio — but our differentiation is audio that feeds the mastery loop (quiz interruptions, FSRS from audio), not just passive listening.

**Our answer:** NotebookLM is a generator. LEARN-X is a learning OS. Every structural weakness above is a table-stakes feature for us.

### ChatGPT Study Mode (OpenAI, July 2025) — New high-urgency entrant

Launched July 29, 2025. Socratic tutoring mode built into ChatGPT across all tiers (Free, Plus, Pro, Team, Edu). Available on all platforms. ChatGPT Edu adds institutional management controls for universities.

**What it doesn't do:** Cannot ingest your own course materials and ground its tutoring in them. No mastery tracking. No FSRS. No concept graph. General-purpose tutoring, not course-specific adaptive learning.

**Our answer:** LEARN-X tutoring is grounded in _the student's own uploaded materials_. ChatGPT Study Mode cannot know what chapter 5 of your professor's notes says. We can. That specificity is the differentiator.

### Anki

**Strengths:** FSRS algorithm is the gold standard for spaced repetition. Deeply trusted by medical students and language learners.

**Weaknesses:** Dated UX. Manual card creation. No AI. No source grounding. No mastery dashboard.

**Our answer:** We ship FSRS-6 from day one (ts-fsrs). Students who currently use LEARN-X + Anki should be able to drop Anki.

### Quizlet

**Strengths:** 60M+ monthly active users. Network effects from 500M+ shared study sets. Strong brand. Teacher market. AI features in Magic Notes and Learn mode.

**Weaknesses:** No FSRS — proprietary Memory Score only. No concept graph. No mastery tracking per learning objective. No professor analytics dashboard. No LMS grade passback. Basic Canvas embedding only, no LTI Advantage. No document → syllabus → lesson pipeline.

**Our answer:** Better AI, FSRS-6 scheduling, source-grounded generation, concept-level mastery. Target Quizlet users explicitly in marketing — they're the most convert-ready audience.

### Khanmigo

**Strengths:** Excellent Socratic tutoring. Integrated into Canvas as an LTI tool (Khanmigo Teacher Tools available free to all US Canvas educators — this is the most significant competitive LMS integration in the space). Well-funded.

**Weaknesses:** Locked to Khan Academy's own content library. Cannot ingest arbitrary course materials. Not applicable to self-directed learners studying their own PDFs. Limited higher ed relevance beyond foundational subjects.

**Our answer:** Socratic mode is a Persona setting (tone_preference = 'socratic'). We serve the self-directed learner and the higher-ed student that Khanmigo's content lock-in can't reach.

### Knewton Alta (Wiley) — Closest institutional competitor

Fully adaptive courseware with mastery-based progression, deep Canvas/Blackboard/Moodle LTI integration, professor dashboard with student mastery analytics. This is the closest thing to LEARN-X v2's institutional vision.

**The critical constraint:** All content is Wiley's own textbooks. You cannot upload your own materials. Professors are locked to Wiley's catalog.

**Our answer:** LEARN-X works on _any_ uploaded materials — the professor's own syllabus, lecture slides, custom PDFs. That's the gap Knewton Alta cannot fill.

---

## Institutional Strategy (B2B)

The B2B motion is sequential, not parallel with B2C:

**Phase 1: Student-led (bottom-up)**
Individual students love LEARN-X. Professors notice their students using it. Organic adoption within institutions. No procurement required for individual student use.

**Phase 2: Professor-led (grassroots institutional)**
Professors use LEARN-X to generate course materials for their students. Professor tools, roster management, concept confusion analytics. Requires FERPA DPA but no LMS integration needed yet. Average timeline to professor adoption from student buzz: 1-2 semesters.

**Phase 3: Institutional (top-down)**
Canvas LTI 1.3 + grade passback. SSO via SAML/OAuth2. SOC 2 Type 1. Admin console. Institutional pricing. Sales cycle: 9-18 months from first contact. Budget windows: May–October for next academic year.

**What Canvas integration actually means:** Canvas has ~50% enrollment share in US higher ed (updated March 2026 — the "35%" figure is outdated). LTI Advantage (LTI 1.3 + grade passback + roster sync) is the current standard. One certification covers Canvas, D2L Brightspace, and others. Build to the standard, not to a single LMS.

**FERPA requirements (start now, not at Phase 3):**
A FERPA Data Processing Agreement (DPA) template is required before _any_ professor pilot involves student data — even Phase 2 professor-led adoption. Key provisions: student data not used for AI model training (LEARN-X's RAG architecture already satisfies this technically — document it explicitly), data deleted within X days of account termination, no third-party sharing without consent.

---

## Feature Priority

### Must have at launch (Phase 1)

These are the features a student needs to replace their current stack. If any of these is missing or mediocre, we lose.

| Feature                                | Why it must be at launch                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Source-grounded chat with citations    | Table stakes. NotebookLM has this. We can't ship without it.                                      |
| Persona-driven lesson generation       | Our core differentiator. If lessons feel generic, nothing else matters.                           |
| **Interest-based explanation framing** | **The signature differentiator. Lessons and examples that feel built for this specific student.** |
| FSRS flashcards                        | The reason to leave Anki. Must be correct. ts-fsrs, FSRS-6.                                       |
| Adaptive quizzes (Bloom's-tagged)      | The reason to leave Quizlet. Must have MCQ + short answer minimum.                                |
| Concept graph                          | The structural feature NotebookLM cannot copy (siloed notebooks).                                 |
| Mastery dashboard                      | The "why am I learning this" loop closure.                                                        |

### High value, Phase 2

| Feature              | Why Phase 2                                                                  |
| -------------------- | ---------------------------------------------------------------------------- |
| Audio recaps         | High demand, but doesn't block the core loop                                 |
| Exam readiness score | High student anxiety value, but needs mastery data to exist first            |
| Study plans          | Needs a few weeks of mastery data to be meaningful                           |
| Socratic mode        | High differentiation, but Persona system supports it already — just needs UI |

### High value, Phase 2 (additions from competitive research)

| Feature                                       | Why Phase 2                                                                          | Competitive context                                                                       |
| --------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Audio recaps with quiz interruptions          | High demand, directly differentiates vs NotebookLM (which has no quiz interruptions) | NotebookLM owns passive audio; we own active learning audio                               |
| Exam system (formal, timed, shareable)        | Structurally different from quizzes — institutional use case                         | No document-to-study tool has this; Gradescope has grading but not generation             |
| Professor tools + concept confusion analytics | Grassroots institutional adoption pathway                                            | Professors want "which concepts is my whole class struggling with" — nobody provides this |
| Syllabus generation from documents            | Drives lesson ordering narrative structure                                           | No competitor generates structured week-by-week syllabus from uploaded materials          |

### Later

| Feature                         | Why later                                                                                                                                                                    |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Collaborative study rooms       | Requires users to already have workspaces worth sharing                                                                                                                      |
| Canvas LTI 1.3 + grade passback | Phase 3 — needed for institutional procurement contracts, not professor-level adoption. Build when first institutional deal is in pipeline (~2-4 weeks engineering for MVP). |
| Blackboard/Moodle integration   | Declining platforms — only if a specific account requires it                                                                                                                 |
| Offline mode                    | Accessibility win but not a retention driver                                                                                                                                 |
| Proctoring                      | Integrate with Respondus/Honorlock via LTI rather than building                                                                                                              |
| SOC 2 Type 1                    | ~$40-70K, 4-8 weeks — start when first institutional conversation begins                                                                                                     |

---

## What NOT to Build (Yet)

These are the scope traps. Each one feels strategic but would delay the core loop.

**Don't build the institutional/professor layer in Phase 1.** It feels strategic (B2B revenue!) but professors only want to recommend a tool that students already love. Get student love first.

**Don't build a mobile app in Phase 1.** The monorepo is mobile-ready (shared packages, Tailwind). But split focus kills execution speed. Mobile comes after the web loop is solid.

**Don't build a marketplace for shared content.** This is a content moderation and trust problem that would consume engineering capacity before the core product works.

**Don't build a fully custom design system from scratch.** shadcn/ui is the right call. The design should feel considered and clean, not "look, we built everything ourselves."

**Don't add more AI providers than necessary for Phase 1.** Start with the minimum set of models that covers all use cases. Adding extra routing before you need it adds testing complexity.

---

## The Real Moat

Features are not the moat. Any well-funded competitor can ship FSRS in three months.

The moat is **learner state** — the accumulated knowledge of how a specific student learns, what they know, and what they need next. This data becomes more valuable the more the student uses the platform.

Specifically:

- Persona evolution (which explanation styles work, which don't — including which interest frames resonated)
- Mastery records (concept-level, built over months)
- Review history (FSRS stability and difficulty per card)
- Interaction patterns (what questions they ask, which concepts they struggle with)
- Framing signal (which interest domains led to faster concept acquisition — this is unique data)

A student who has used LEARN-X for a semester has a learning profile that makes every new course they take better. That is extremely hard to replicate by switching to a competitor.

The emotional layer matters too. When a student gets an explanation in their domain — and it clicks — the attribution is _"this tool gets me."_ That is emotional lock-in on top of data lock-in.

This is why Persona must affect behavior, not just wording. The long-term value of LEARN-X is the compound effect of learning about the learner. If the Persona system is superficial — if interest-based framing is a gimmick that repeats the same basketball analogy every lesson — we have no moat. Done right, it is the most human part of the product.

---

## Success Metrics for Phase 1

**Activation** (did the product work on first try?)

- % of users who complete their first document upload and see lessons generated
- Target: >70%

**Engagement** (do students come back?)

- Day-7 retention
- Target: >40%

**Core loop completion** (did students use the whole loop?)

- % of users who complete: upload → lesson → quiz → flashcard review → see mastery dashboard
- Target: >25% in first week

**AI quality signal**

- Average quiz self-reported quality score (1–5)
- Target: ≥4.0

**Study effectiveness** (the long-term bet)

- Average mastery level improvement per concept over 7 days
- This becomes the key metric after Phase 1 ships

---

## Pricing Strategy (Post-Phase 1)

Start free with generous limits to drive activation and word-of-mouth.

| Tier        | Price   | Limits                                                            | Who                 |
| ----------- | ------- | ----------------------------------------------------------------- | ------------------- |
| Free        | $0      | 3 workspaces, 5 documents each, 50 chat messages/mo               | Students evaluating |
| Student     | $12/mo  | Unlimited workspaces + documents, unlimited chat, audio           | Serious students    |
| Scholar     | $25/mo  | Everything + study plans, priority processing, advanced analytics | Power users         |
| Institution | Contact | Per-seat, professor dashboard, LMS, SSO                           | Phase 3             |

Do not launch with a paywall. Friction at the top of the funnel before product-market fit kills growth.

**Market benchmarks (March 2026):** NotebookLM free/~$14-20/month. Quizlet ~$36/year. Khanmigo $4/month student, $25/month teacher. Knewton Alta $30-80/course. Institutional per-seat pricing: $5-15/student/semester is the market range. The $12/month Student tier is competitive; the $25/month Scholar tier should have clear value-add (study plans, audio, advanced analytics) to justify vs Quizlet at $3/month.
