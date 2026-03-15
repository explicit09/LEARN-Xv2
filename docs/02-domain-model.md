# Domain Model

## The Canonical Nouns

These are the permanent entities. Do not rename them. Do not introduce synonyms. When in doubt, use these exact words — in code, in database tables, in API routes, in UI copy.

| Entity | Definition | Aggregate Root? |
|--------|-----------|----------------|
| **User** | Authenticated identity with profile and preferences | Yes |
| **Persona** | The User's learning profile: style, interests, tone, difficulty preference | Owned by User |
| **Workspace** | Root learning container. Everything belongs to a Workspace | Yes (primary root) |
| **Document** | An uploaded source file (PDF, DOCX, PPTX, TXT, URL, YouTube) | Owned by Workspace |
| **Chunk** | A semantically meaningful segment of a Document, with embedding | Owned by Document |
| **Concept** | An extracted knowledge unit with typed relationships to other Concepts | Owned by Workspace |
| **Lesson** | AI-generated learning content for a topic/concept cluster | Owned by Workspace |
| **Syllabus** | AI-generated course structure derived from Documents: hierarchical outline (unit → topic → subtopic) that drives lesson ordering and learning path narrative | Owned by Workspace |
| **Artifact** | Any generated study material: Quiz, Exam, FlashcardSet, StudyGuide, AudioGeneration | Owned by Workspace |
| **MasteryRecord** | Per-concept, per-user understanding state with FSRS scheduling data | Owned by User × Concept |
| **Job** | Any long-running task with lifecycle, progress, and retry semantics | System-level |
| **ChatSession** | A conversation thread within a Workspace or Lesson context | Owned by Workspace |
| **ChatMessage** | A single message in a ChatSession (user or assistant) | Owned by ChatSession |

---

## Entity Relationships

```
User
 └── Persona (1:many, versioned)

Workspace
 ├── Document (1:many)
 │    └── Chunk (1:many)
 │         └── ChunkEmbedding (1:1)
 ├── Concept (1:many)
 │    └── ConceptRelation (self-referential: prerequisite, related, part_of, extends)
 ├── Lesson (1:many)
 ├── Syllabus (1:1 per Workspace, versioned)
 │    └── SyllabusUnit (1:many, ordered)
 │         └── SyllabusTopic (1:many, ordered)
 ├── Quiz (1:many)
 │    └── QuizQuestion (1:many)
 ├── Exam (1:many) — timed, formal, shareable via token; distinct from Quiz
 │    └── ExamQuestion (1:many)
 │    └── ExamAttempt (1:many, per user, with time tracking)
 ├── FlashcardSet (1:many)
 │    └── Flashcard (1:many, FSRS state per card)
 ├── StudyGuide (1:many)
 ├── AudioGeneration (1:many)
 └── ChatSession (1:many)
      └── ChatMessage (1:many)

User × Concept → MasteryRecord (junction with state)
User × Flashcard → FlashcardReview (history log)
User × Quiz → QuizAttempt → QuizResponse (per question)

Chunk ←→ Concept (many:many via chunk_concepts)
Lesson ←→ Concept (many:many via lesson_concepts)
```

---

## Bounded Contexts

Each context owns its data and logic. Do not reach across context boundaries via direct database joins from application code — use the service/module API.

### Identity & Access
Owns: User, Persona, auth sessions, roles, permissions, audit log.
Exposes: `getUser()`, `updatePersona()`, `requireAuth()` middleware.
Does not know about: Workspaces, Documents, Lessons.

### Workspace Core
Owns: Workspace lifecycle, settings, collaborators (Phase 3), document membership.
Exposes: `createWorkspace()`, `getWorkspace()`, `listWorkspaces()`, `getWorkspaceStats()`.
Does not know about: Lessons, Chunks, AI generation.

### Ingestion
Owns: Document upload, parsing, chunking, embedding generation, storage.
Exposes: `processDocument()` (Job trigger), document status updates.
Does not know about: Concepts, Lessons, Mastery.
Input: raw file or URL. Output: Chunks + ChunkEmbeddings stored in DB.

### Knowledge Store
Owns: Chunks, ChunkEmbeddings, Concepts, ConceptRelations, hybrid search.
Exposes: `hybridSearch()`, `extractConcepts()`, `getConceptGraph()`, `linkChunksToConcepts()`.
The one retrieval path lives here. Nothing bypasses it.

### Learning Engine
Owns: Lesson generation, syllabus ordering, concept sequencing, study plans.
Exposes: `generateLessons()` (Job trigger), `getOrderedLessons()`, `generateStudyPlan()`.
Depends on: Knowledge Store (for retrieval), Personalization (for adaptation).

### Personalization Engine
Owns: Persona state, all four personalization layers, framing decisions.
Exposes: `buildPersonaContext()`, `resolveFramingContext()`, `adaptContent()`, `updateFromBehavior()`.
Called by: Learning Engine, Artifacts (quiz difficulty, example framing), Chat (response style, analogy selection).
Does not generate content — it shapes how others generate.

Four internal layers (see `12-personalization-engine.md`):
- **Learner Profile** — interests, aspirations, affinity domains, motivational style
- **Pedagogical Profile** — explanation style, depth, tone, structure preference
- **Performance Profile** — weak concepts, error patterns, confusion triggers (updated live)
- **Framing Engine** — decides what analogy/example domain to use, and when NOT to use one

### Learning Runtime
Owns: Lesson consumption tracking, lesson-level chat, note-taking, explanation loops.
Exposes: `startLesson()`, `completeLesson()`, `createChatSession()`.
Fires events: `LESSON_STARTED`, `LESSON_COMPLETED`, `CHAT_MESSAGE_SENT`.

### Learning Artifacts
Owns: Quiz generation + attempts + responses, Exam generation + attempts + sharing tokens, Flashcard generation + FSRS scheduling + review history, StudyGuide generation, AudioGeneration.
Exposes: `generateQuiz()`, `submitQuizResponse()`, `generateExam()`, `startExamAttempt()`, `submitExamAttempt()`, `generateFlashcards()`, `submitFlashcardReview()`, `generateAudio()`.

**Quiz vs Exam distinction:** Quiz = informal, formative, unscoped, immediate feedback per question. Exam = timed, formal, summative, shareable via join token, scored on completion. Grade passback to LMS (Phase 3) targets Exam, not Quiz.

### Analytics & Mastery
Owns: LearningEvents, MasteryRecords, study streaks, intervention signals, mastery estimates.
Exposes: `getWorkspaceMastery()`, `getConceptMastery()`, `getDashboard()`, `getWhatToStudyNext()`.
The single source of truth for "how well does the student understand X."

### Job Orchestrator
Owns: Job lifecycle, Trigger.dev integration, progress broadcasting via Supabase Realtime.
Exposes: `createJob()`, `updateJobProgress()`, `cancelJob()`.
All other contexts create Jobs through this context, never directly.

### AI Observability
Owns: `ai_requests` log, cost accounting, prompt versioning.
Exposes: `recordAIRequest()` — called by every LLM call site.
Read by: Admin, internal dashboards. Not exposed to students.

---

## What "Syllabus" Means (Important)

A Syllabus is a **living document**. It is not a one-time generation artifact — it is the evolving narrative scaffold of a Workspace. Every time a new Document is added, the Syllabus is updated, not replaced.

### Syllabus vs. Concept Graph

These are two parallel structures. Both are needed. Neither replaces the other.

| | Concept Graph | Syllabus |
|--|--------------|---------|
| **Structure** | Prerequisite DAG | Hierarchical tree (unit → topic → subtopic) |
| **Ordering** | Topological sort of dependencies | Narrative flow matching the source documents |
| **Source** | Extracted from chunk content | Inferred from document headings, table of contents, learning objectives |
| **Role** | Drives concept dependency tracking and mastery | Drives lesson ordering and learning path narrative |
| **Use** | "What must I understand before X?" | "Where does X fit in the story of this course?" |

Both drive lesson ordering in Phase 1D: concepts provide the dependency constraints; the syllabus provides the narrative chapter-level grouping that makes the sequence feel like a course, not a random list.

### Document Roles

Every Document added to a Workspace is assigned a role. This role shapes how the syllabus is synthesized.

| Role | Meaning | Detection heuristics |
|------|---------|---------------------|
| `primary` | Defines the course structure — drives unit/topic creation | Long (20+ pages), has headings that look like chapters/sections, explicit table of contents, follows textbook or lecture-note structure |
| `supplementary` | Enriches existing topics with depth, examples, or alternate views | Medium length, headings match existing syllabus topics, or LLM-detected intent "extends prior material" |
| `reference` | Used only for RAG retrieval — not incorporated into syllabus or lessons | Reference sheets, glossaries, appendices, formula tables, short summaries, style guides |

Role is auto-detected with confidence score. When confidence is below threshold (~0.65), the system defaults to `supplementary` and surfaces a UI prompt asking the user to confirm the role. Users can always override.

### Incremental Update Flow (new document added to existing workspace)

When a user adds a new Document to a Workspace that already has an active Syllabus:

```
New document uploaded and processed
  → classify document role (primary | supplementary | reference)
  → if role = 'reference': skip syllabus update, mark doc as reference-only
  → if role = 'supplementary':
      → map-to-syllabus job: LLM determines which existing topics this doc enriches
      → link doc to those topics in syllabus_topic_documents
      → set lessons.source_updated = true for affected lessons
      → no new units/topics created unless there are clearly uncovered concepts
  → if role = 'primary':
      → update-syllabus job: full incremental merge
      → extract new outline from primary doc
      → compare new units/topics against existing syllabus (cosine similarity ≥ 0.85 = same topic)
      → merge matching topics, append new units/topics at appropriate position
      → increment syllabus version (old version = 'superseded')
      → invalidate lessons that cover changed/merged topics (source_updated = true)
      → do NOT auto-delete or auto-regenerate lessons
```

**The "AI proposes, human disposes" principle:** Lesson staleness is surfaced to the user as a non-blocking notification: "3 lessons may be affected by your new document — review and regenerate if needed." The user triggers regeneration. The system never silently overwrites existing lesson content.

### Multi-Document Batch Upload

When a user uploads multiple documents simultaneously (or in rapid succession within a ~30-second window), the system coordinates them as a batch before synthesizing the syllabus:

```
Documents uploaded in same batch (same upload_batch_id)
  → all documents processed in parallel (parse → chunk → embed)
  → wait for all documents in batch to reach 'completed' status
  → synthesize-syllabus job: holistic synthesis from all new documents together
      → classify roles for all batch documents
      → if workspace has no syllabus: generate-syllabus from scratch using all docs
      → if workspace has existing syllabus: update-syllabus treating batch as a unit
  → avoids ordering conflicts that would arise from incremental single-doc updates
```

**Why batch coordination matters:** If doc A says "Chapter 3: Optimization" and doc B says "Chapter 1: Foundations," processing them independently could create a syllabus with wrong ordering. Batch synthesis sees both at once and infers the correct relationship.

### Syllabus Versioning

Syllabuses are versioned, not mutated. When a syllabus update is triggered:
1. The existing active syllabus is marked `superseded`
2. A new version is created from the merged state
3. Lessons retain their `syllabus_topic_id` pointing to the old topic records (which are preserved on the superseded version)
4. After user reviews and confirms, lessons can be re-linked to the new topic records

This ensures students who are mid-course when a new document is added don't lose their progress or see their lesson list change unexpectedly.

---

## What "Workspace" Means (Important)

Workspace is the primary aggregate root. It is:
- The unit of access control (a user owns workspaces)
- The unit of knowledge isolation (RAG search is always scoped to a workspace)
- The unit of learning (mastery is tracked per workspace)
- The unit of collaboration (Phase 3: share a workspace with classmates)

A Workspace is NOT a Course (that's Phase 2-3 — a Course is a professor-managed Workspace with an enrolled student roster). Students create Workspaces freely. Professors create Courses that provision Workspaces for enrolled students.

**Course (Phase 2-3):** A professor-owned container that enrolls students, distributes Documents and Syllabuses, and aggregates per-student mastery data into a class-level analytics view. A Course has an InstructorProfile, a roster (CourseEnrollment), and a canonical Syllabus. Each enrolled student gets a personal Workspace pre-seeded with the course's Documents.

---

## What "Persona" Means (Important)

A Persona is not a UI theme. It is not a system prompt prefix. It is the behavioral specification for how the platform teaches this specific user.

A Persona has four layers:

1. **Learner Profile** — interests, hobbies, aspirations, affinity domains, motivational style
2. **Pedagogical Profile** — visual vs. textual, theory-first vs. example-first, depth, tone, pace
3. **Performance Profile** — weak concepts, mastery trends, error patterns, confusion triggers (updated continuously from behavior)
4. **Framing Profile** — which interest/domain to use as explanation bridge, and when to set it aside

A Persona affects:
- Which concepts get taught first (based on declared knowledge gaps)
- How deep explanations go (declared depth preference, inferred from quiz performance)
- What example domains to use (from interests — "explain momentum using basketball fast breaks")
- How analogies are chosen and when to drop them for precision
- How fast lessons move (inferred from reading speed signals)
- Quiz difficulty starting point (declared + inferred)
- Remediation style (Socratic vs. direct explanation)
- Study schedule density (declared availability)
- Career/goal relevance framing in lesson hooks

Persona has versions. When a user's behavior diverges significantly from their stated preferences, the system creates a new Persona version, not a mutation of the existing one.

See `12-personalization-engine.md` for the full specification of all four layers, the Framing Engine logic, and onboarding design.

---

## Event Schema (Canonical)

All events are written to `learning_events`. They drive mastery updates and trigger interventions.

```
DOCUMENT_UPLOADED
DOCUMENT_PROCESSING_STARTED
DOCUMENT_PROCESSING_COMPLETED
DOCUMENT_PROCESSING_FAILED

LESSON_STARTED
LESSON_COMPLETED
LESSON_SECTION_VIEWED

QUIZ_STARTED
QUIZ_COMPLETED
QUIZ_QUESTION_ANSWERED

FLASHCARD_REVIEWED          { rating: 1|2|3|4 }
FLASHCARD_SESSION_COMPLETED

CHAT_MESSAGE_SENT
CHAT_CITATION_CLICKED

EXAM_STARTED                { examId, attemptId, timeLimitSeconds }
EXAM_COMPLETED              { examId, attemptId, score, timeTakenSeconds }

AUDIO_GENERATION_STARTED    { audioId }
AUDIO_GENERATION_COMPLETED  { audioId }
AUDIO_PLAYBACK_STARTED      { audioId }
AUDIO_QUIZ_INTERRUPTED      { audioId, timestampSeconds, questionId }

SYLLABUS_GENERATED          { workspaceId, syllabusId, documentCount }
SYLLABUS_UPDATED            { workspaceId, syllabusId, newVersion, triggeredByDocumentId }
LESSON_STALENESS_FLAGGED    { workspaceId, lessonId, reason: 'source_updated' | 'topic_merged' }

CONCEPT_MASTERY_UPDATED     { conceptId, oldLevel, newLevel }
CONCEPT_MASTERED            { conceptId }

JOB_STARTED                 { jobId, jobType }
JOB_PROGRESS                { jobId, progress, message }
JOB_COMPLETED               { jobId }
JOB_FAILED                  { jobId, error }
```

Events must not carry PII in their `metadata` field. Reference entity IDs only.
