# Personalization Engine

## Why This Exists

Most personalization in AI learning tools is surface-level:
- adjust tone
- shorten or lengthen summaries
- change quiz difficulty
- alter pace

LEARN-X does all of that. But the more important layer is one almost no tool does well:

**Identity-linked explanation framing.**

If a student understands the world through basketball, music, fashion, business, gaming, or finance, LEARN-X uses those frames to make difficult concepts click faster — without sacrificing rigor.

The goal is not to make content cute. The goal is to reduce the cognitive distance between a hard idea and the student's existing mental models. Educational psychology broadly supports connecting new material to prior knowledge and learner interest as the most reliable path to deeper encoding and longer retention.

---

## Two Kinds of Personalization

LEARN-X must do both. Most products do only the first.

### 1. Cognitive Personalization

Adapts to the student's **performance and preferences**:

| Signal | What it drives |
|--------|---------------|
| Current mastery per concept | Lesson order, prerequisites surfaced first |
| Confusion level | Triggers re-explanation, Socratic follow-up |
| Prerequisite gaps | Automatically inserts prep content before blocked lessons |
| Preferred modality | Visual-heavy vs. text-heavy component selection |
| Difficulty tolerance | Quiz question complexity, flashcard density |
| Pace signals | Reading time vs. content length → adjusts target length |
| Error patterns | Repeating mistake types trigger targeted examples |

### 2. Identity Personalization

Adapts to **who the student is**, not just how they perform:

| Signal | What it drives |
|--------|---------------|
| Interests and hobbies | Analogy domain selection, example world |
| Career aspiration | Relevance framing ("this matters because in [field]...") |
| Familiar domains | Use of domain vocabulary as a bridge |
| Cultural context | Example selection and scenario setting |
| Motivational style | Challenge-driven vs. progress-celebration framing |

---

## The Four Layers

### Layer 1 — Learner Profile

Stores who the student is. Set at onboarding, refined over time.

```typescript
type LearnerProfile = {
  interests: string[]            // ['basketball', 'finance', 'gaming']
  aspirations: string[]          // ['software engineer', 'pre-med']
  affinityDomains: string[]      // domains they understand intuitively
  dislikedExplanationStyles: string[]   // ['overly abstract', 'math-heavy']
  motivationalStyle: 'challenge' | 'progress' | 'mastery' | 'curiosity'
}
```

Not a form. Collected conversationally during onboarding ("what do you love? what do you want to do with this knowledge?") and refined silently as behavior reveals true preferences.

### Layer 2 — Pedagogical Profile

Stores how the student learns best.

```typescript
type PedagogicalProfile = {
  explanationStyle: 'visual' | 'textual' | 'step_by_step' | 'narrative'
  structurePreference: 'theory_first' | 'example_first' | 'socratic'
  depthPreference: 'concise' | 'thorough' | 'academic'
  tonePreference: 'formal' | 'conversational' | 'direct' | 'socratic'
  challengeTolerance: 'low' | 'medium' | 'high'
  pacePreference: 'slow' | 'standard' | 'fast'
}
```

### Layer 3 — Performance Profile

The live record of what the student knows and where they struggle. This is the cognitive personalization layer.

```typescript
type PerformanceProfile = {
  weakConcepts: ConceptId[]
  masteryTrends: { conceptId: ConceptId, trend: 'improving' | 'stable' | 'declining' }[]
  commonErrorPatterns: string[]    // 'confuses correlation with causation', 'skips base case in proofs'
  confusionTriggers: string[]      // 'abstract notation without examples', 'long definitions before context'
  retentionStrengths: ConceptId[]
}
```

Updated automatically from: quiz responses, flashcard ratings, lesson re-reads, chat questions asked.

### Layer 4 — Framing Engine

The piece that was missing. This layer decides **what explanation frame to use** when generating content.

It does not generate content. It shapes how generation happens.

```typescript
type FramingContext = {
  analogyDomain: string | null      // 'basketball' | 'music' | 'finance' | null (use none)
  exampleWorld: string | null       // what world to ground practice scenarios in
  relevanceFrame: string | null     // career/goal framing to open with
  framingStrength: 'light' | 'moderate' | 'none'  // how much to lean on the interest frame
  academicPrecisionRequired: boolean // if true, keep domain language precise
}
```

**The framing engine decides when NOT to use interest-based framing**, which is just as important as when to use it. Overuse turns the product into a gimmick.

#### When to use interest-based framing:
- Concept is abstract with no clear real-world anchor in the material
- Student has a strong, relevant interest that genuinely maps
- Multiple analogies are available — pick the most resonant one
- Early in a lesson (hook and first example) — the hardest moment to engage

#### When NOT to use interest-based framing:
- Academic precision is more important than accessibility (e.g., medical, legal, exact definitions)
- The interest is a stretch and would produce a weak analogy
- The student already has prior domain knowledge in the subject (no bridge needed)
- The explanation is already concrete — forcing an analogy weakens clarity
- Repeated use within the same session — rotate or drop

**The rule:** use interests as a bridge, not a costume. Once the student crosses the bridge, discard it and teach with precision.

---

## How the Four Layers Combine

When building a `PersonaContext` before any content generation:

```typescript
async function buildPersonaContext(userId: string): Promise<PersonaContext> {
  const persona = await db.query.personas.findFirst({
    where: eq(personas.userId, userId),
    orderBy: desc(personas.createdAt),   // always use latest version
  })

  const learner = persona.learnerProfile as LearnerProfile
  const pedagogical = persona.pedagogicalProfile as PedagogicalProfile
  const performance = persona.performanceProfile as PerformanceProfile

  // Framing engine decides the frame
  const framingContext = resolveFramingContext({
    interests: learner.interests,
    conceptAbstractness: 'high' | 'low',  // passed in from caller
    sessionFramingCount: sessionState.framingCount,
    academicFieldType: workspace.fieldType,
  })

  return {
    learner,
    pedagogical,
    performance,
    framing: framingContext,
  }
}
```

---

## Where Framing Appears

### Lesson Generation

The framing context feeds directly into the lesson generation prompt:

```
Student interests: {interests}
Suggested analogy domain: {analogyDomain} (use if it genuinely helps, skip if forced)
Framing strength: {framingStrength}
Career relevance: {relevanceFrame}

Use the analogy domain to introduce the concept if natural.
Once the student understands the mechanics, drop the analogy and use precise academic language.
Do not force a metaphor where the literal explanation is clearer.
```

### Quiz Generation

When generating worked examples and practice scenarios:
- Embed the example scenario in the student's interest domain when relevance is high
- Keep the underlying concept pure — only the scenario wrapper changes
- Example: probability question using sports outcomes, still tests Bayes' theorem exactly

### Chat Responses

The chat system prompt includes:
```
When choosing examples to illustrate concepts, prefer examples from: {interests}
When none of the student's interest domains apply naturally, use a universally concrete scenario.
Never force an analogy. Clarity > personalization when they conflict.
```

### Flashcard Hints

When a student requests a hint or context on a hard card:
- Offer a memory cue framed in their interest domain
- "Think of this like [analogy from interests] — the core idea is..."

---

## Onboarding Flow

Interest-based personalization only works if we collect the right signal. The onboarding should feel like a conversation, not a form.

**Questions to ask (3–4 max, conversational):**

1. "What are you studying this for — class, a certification, just curiosity?"
2. "What do you spend time on outside of studying? Any passions, hobbies, things you follow closely?"
3. "How do you usually prefer to learn something new — start with examples and build up, or understand the theory first?"
4. "When something is confusing, what usually helps — a different explanation, more examples, or being questioned on it?"

Store answers as structured `LearnerProfile` + `PedagogicalProfile` fields. Do not store raw text — parse into canonical values during onboarding.

---

## Persona Versioning

A Persona is not mutated once created. It is **versioned**.

When behavior consistently diverges from declared preferences (measured over 7+ sessions), the system creates a new Persona version. The old version is preserved for audit.

Trigger conditions for new Persona version:
- Student consistently skips sections of their declared `explanationStyle`
- Quiz performance doesn't improve despite `difficulty_tolerance: high` adjustments
- Chat questions reveal a different understanding level than the declared `depthPreference`
- Student explicitly updates their preferences in settings

Versioned personas let the system A/B the new persona against the old one before fully committing.

---

## What This Means Strategically

LEARN-X's moat is learner state. Interest-based framing is the layer that makes learner state feel personal.

When a student gets an explanation that uses their domain — and it clicks — the attribution is "this tool gets me." That is emotional lock-in, not just feature lock-in.

The positioning becomes:

> NotebookLM helps you understand your sources.
> LEARN-X helps you understand them in the way your brain connects best.

Combined with mastery tracking and FSRS scheduling, LEARN-X becomes:
**grounded + adaptive + personally framed**

That is a product identity no current tool holds.

---

## Database Fields

The `personas` table in `03-database.md` stores all four layers. Relevant columns:

```sql
interests           text[]     -- ['basketball', 'finance', 'gaming']
aspiration_tags     text[]     -- ['software engineer', 'pre-med']
affinity_domains    text[]     -- domains they understand intuitively
explanation_preferences jsonb  -- PedagogicalProfile as structured JSON
```

See `03-database.md` for full schema. See `07-ai-pipeline.md` for how these feed into generation.
