# Pipeline Comparison: LEARN-X v1 vs v2

> **Purpose:** Code-verified analysis of the document-to-lesson pipeline in both codebases. Identifies what v2 does better, what v1 does better, and what v2 should port.
>
> **Date:** March 2026
>
> **Method:** Direct code reading of both `/Users/tadies/Projects/LEARN-X` (v1, Python/FastAPI) and `/Users/tadies/Projects/LEARN-Xv2` (v2, TypeScript/Next.js/Trigger.dev).

---

## Pipeline Architecture Overview

Both codebases follow the same high-level flow but implement it differently:

```
Upload → Extract Text → Chunk → Embed → Extract Concepts → Syllabus → Generate Lessons
```

**v1:** Python async pipeline with in-process orchestration, SSE streaming, Redis-backed events.
**v2:** Trigger.dev job chain — each stage is a separate job that triggers the next.

---

## Stage-by-Stage Comparison

### 1. Document Upload

| Aspect          | v1 (Python)                               | v2 (TypeScript)                                                             |
| --------------- | ----------------------------------------- | --------------------------------------------------------------------------- |
| **Protocol**    | Single POST, file read into server memory | Two-phase: signed URL → client uploads direct to Supabase Storage → confirm |
| **Max size**    | 10 MB                                     | 50 MB                                                                       |
| **File types**  | pdf, docx, txt, md                        | pdf, docx, pptx, txt, md, html                                              |
| **Auth**        | JWT middleware                            | tRPC context + RLS policies                                                 |
| **Job trigger** | `asyncio.create_task()` in-process        | Trigger.dev `tasks.trigger()` with run ID stored in `jobs` table            |

**Winner: v2.** Two-phase upload avoids server memory pressure. Larger file limit, more formats. Trigger.dev provides reliable job execution with retries.

**Key files:**

- v1: `apps/backend/backend/api/routers/upload.py`
- v2: `apps/web/src/server/routers/document.ts`

---

### 2. Text Extraction

| Aspect                   | v1 (Python)                                                                                                             | v2 (TypeScript)                                        |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **PDF**                  | PyPDF/pdfplumber via `DocumentParser`                                                                                   | unpdf (Mozilla pdf.js)                                 |
| **Scanned PDF fallback** | None                                                                                                                    | Gemini 2.0 Flash OCR (multimodal, sends PDF as base64) |
| **DOCX**                 | python-docx with paragraph + table detection                                                                            | mammoth (raw text only)                                |
| **PPTX**                 | Basic support                                                                                                           | JSZip XML parsing with speaker notes extraction        |
| **HTML**                 | Not supported                                                                                                           | Regex strip (scripts, styles, tags, entities)          |
| **Structured parsing**   | `DocumentParser` → `ParsedDocument` with page grounding, heading hierarchy, block-type classification, `GroundedChunks` | Flat text extraction only                              |

**Winner: v1 for structure, v2 for coverage.**

v1's `DocumentParser` produces `ParsedDocument` with:

- `blocks`: structural document elements
- `chunks`: `GroundedChunk` objects with `page_start`, `page_end`, `heading_path`, `importance_score`, `content_types`, `block_ids`
- `hierarchy_nodes`: document structure tree

This structured metadata flows downstream — chunks carry their page location and section context. v2 extracts flat text with no structural metadata.

However, v2 handles scanned PDFs (Gemini OCR fallback), PPTX (slide text + speaker notes), and HTML — formats v1 doesn't support or handles poorly.

**Key files:**

- v1: `apps/backend/backend/services/core/extraction.py`, `apps/backend/backend/services/document_parser.py`
- v2: `trigger/src/lib/text-extraction.ts`

---

### 3. Chunking

| Aspect                  | v1 (Python)                                                                                              | v2 (TypeScript)                           |
| ----------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| **Algorithm**           | Sentence-boundary-aware (`smart_chunk_text()`)                                                           | Pure word-count splitting (`chunkText()`) |
| **Target size**         | 150 words                                                                                                | 512 tokens (~2048 chars)                  |
| **Overlap**             | 20 words from previous chunk                                                                             | 15% of target (~307 chars)                |
| **Sentence awareness**  | Yes — `_find_sentence_boundary()` backtracks to last complete sentence                                   | No — splits mid-sentence                  |
| **Structure detection** | `_detect_chunk_type()` classifies as code/table/list/definition/paragraph via regex patterns             | None                                      |
| **Grounded chunks**     | When structured extraction succeeds, uses `GroundedChunks` directly (page, heading, importance metadata) | Not applicable                            |
| **Token counting**      | tiktoken (exact)                                                                                         | `text.length / 4` heuristic               |

**Winner: v1.**

v1's `smart_chunk_text()` respects sentence boundaries — it accumulates words to 150-word target, then backtracks to the last period if possible (minimum 100 words). The `_detect_chunk_type()` function classifies each chunk's structural type (code, table, list, definition, paragraph) which provides useful downstream metadata.

**Important nuance:** v1's structure detection is classification-only — it does not prevent splitting code blocks or tables mid-chunk. The `_should_keep_together()` function exists but is not called in the main chunking path. The actual split-prevention is aspirational, not implemented.

When structured extraction works, v1 skips `smart_chunk_text()` entirely and uses `convert_grounded_chunks_to_legacy()`, which passes through the `DocumentParser`'s grounded chunks with full page/heading metadata.

v2's chunker is intentionally simple (75 lines of code) but loses quality at chunk boundaries due to mid-sentence splits.

**Key files:**

- v1: `apps/backend/backend/services/text_processor.py` (lines 76-203)
- v2: `trigger/src/lib/chunker.ts`

---

### 4. Chunk Enrichment (Contextual Retrieval)

| Aspect              | v1  | v2                                                                                                                                           |
| ------------------- | --- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Has enrichment?** | No  | Yes                                                                                                                                          |
| **Model**           | —   | GPT-5.4-Nano                                                                                                                                 |
| **Approach**        | —   | For each chunk, sends full document context (~100K chars) + chunk to LLM, gets 1-2 sentence description of what chunk covers and how it fits |
| **Concurrency**     | —   | 10 parallel calls                                                                                                                            |
| **Storage**         | —   | `enriched_content` column on `chunks` table; enriched text used for embedding and FTS                                                        |

**Winner: v2.** This is the highest-ROI single improvement to retrieval quality. Per Anthropic's research, contextual embeddings reduce retrieval failure by 38% vs baseline. v1 has no equivalent.

**Key files:**

- v2: `trigger/src/jobs/process-document.ts` (lines 195-258)

---

### 5. Embedding Generation

| Aspect                 | v1                                                         | v2                                                             |
| ---------------------- | ---------------------------------------------------------- | -------------------------------------------------------------- |
| **Model**              | `text-embedding-3-small` (1536d)                           | `text-embedding-3-large` (3072d)                               |
| **What gets embedded** | Raw chunk content                                          | Enriched content (context + chunk) or raw if enrichment failed |
| **Batch size**         | 150 per API call                                           | 100 per API call                                               |
| **Storage**            | `document_chunks.embedding` + `workspace_embeddings` table | `chunk_embeddings.embedding` as `halfvec(3072)`                |
| **Index**              | Not verified                                               | HNSW with `halfvec_ip_ops` (inner product)                     |
| **Fallback**           | Batch → parallel individual → skip                         | None (job fails on error)                                      |

**Winner: v2.** Larger embedding model produces higher-quality vectors. Combined with contextual enrichment, the embedding quality gap is significant. The `halfvec` storage and HNSW index are properly optimized for 3072 dimensions.

v1's fallback chain (batch → parallel individual) is more resilient, which is worth noting.

**Key files:**

- v1: `apps/backend/backend/services/core/extraction.py` (lines 145-318)
- v2: `trigger/src/jobs/process-document.ts` (lines 260-294)

---

### 6. Subject Detection

| Aspect                | v1                                      | v2                                                                                                                                   |
| --------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Has detection?**    | No (relies on topic structure analysis) | Yes                                                                                                                                  |
| **Model**             | —                                       | GPT-5.4-Nano                                                                                                                         |
| **Output**            | —                                       | domain, subfield, content_type, academic_level, has_math, has_code, pedagogical_framework, scaffolding_direction, component_emphasis |
| **Storage**           | —                                       | `documents.metadata` + `workspaces.settings`                                                                                         |
| **Downstream impact** | —                                       | Domain config selects pedagogical framework (PRIMM, 5E, Worked Examples, etc.) for lesson generation                                 |

**Winner: v2.** Subject detection feeds directly into domain-specific lesson generation. v1 has no equivalent — its topic extractor infers complexity but not pedagogical approach.

**Key files:**

- v2: `trigger/src/lib/subject-detection.ts`

---

### 7. Topic / Concept Extraction

These stages do fundamentally different things in v1 vs v2.

**v1 approach — Topic-first:**

1. `EnhancedTopicExtractor` (Gemini Flash) extracts 5-15 **topics** (lesson units) from document text
2. 4-step process: admin/exam gate → structure extraction → chunk distribution → AI extraction
3. Separate `ConceptExtractor` runs in parallel to extract concepts
4. Topics have: title, description, complexity, key_concepts, learning_objective, estimated_time, prerequisites, order_index
5. Has admin/exam document filtering — skips non-learnable content

**v2 approach — Concept-first:**

1. `extract-concepts` job (Claude Sonnet 4.6) extracts 5-15 **concepts** (knowledge atoms) from enriched chunks
2. Concepts have explicit **relations**: `prerequisite | related | part_of | extends`
3. Deduplication via normalized name matching + 60% word overlap threshold
4. Relations stored in `concept_relations` table — builds a knowledge graph
5. Separate `generate-syllabus` job organizes concepts into units → topics hierarchy

| Aspect               | v1                                                   | v2                                                             |
| -------------------- | ---------------------------------------------------- | -------------------------------------------------------------- |
| **Extraction model** | Gemini Flash (fast)                                  | Claude Sonnet 4.6 (higher quality)                             |
| **What's extracted** | Topics (lesson units) directly                       | Concepts (knowledge atoms) + explicit relations                |
| **Admin filtering**  | Yes — skips exam/admin documents                     | No                                                             |
| **Knowledge graph**  | Concepts extracted separately, no explicit relations | Explicit `prerequisite/related/part_of/extends` relations      |
| **Deduplication**    | Overlap detector across documents                    | Normalized name matching + word overlap                        |
| **Downstream use**   | Topics become lessons 1:1                            | Concepts are ordered topologically, then each becomes a lesson |

**Winner: v2 architecturally.** The concept-first approach with explicit relations enables topological ordering (prerequisites generated before dependents) and a richer knowledge graph. v1's admin filtering is a practical feature v2 lacks.

**Key files:**

- v1: `apps/backend/backend/services/analysis/enhanced_topic_extractor.py`, `apps/backend/backend/services/core/concept_analysis.py`
- v2: `trigger/src/jobs/extract-concepts.ts`, `trigger/src/lib/concept-utils.ts`

---

### 8. Syllabus Generation

| Aspect            | v1                                                                             | v2                                                         |
| ----------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| **Input**         | Topics + concepts + persona + existing syllabus                                | Concepts + document titles                                 |
| **Merge support** | Yes — merges with existing workspace syllabus                                  | No (supersedes previous)                                   |
| **Versioning**    | Not explicit                                                                   | Versioned with `active/superseded` status                  |
| **Output**        | `DocumentSyllabus` with lessons list, learning path graph, prerequisite chains | Units → Topics hierarchy, linked to concepts and documents |
| **Guard**         | Generates regardless                                                           | Requires ≥2 concepts                                       |

**Winner: v2 for data model.** Units → topics → concepts/documents is a cleaner relational model. v1's syllabus merge capability is valuable for multi-document workspaces though.

**Key files:**

- v1: `apps/backend/backend/services/core/syllabus_management.py`
- v2: `trigger/src/jobs/generate-syllabus.ts`

---

### 9. Lesson Generation

This is the most complex stage and the most nuanced comparison.

#### 9a. Retrieval

| Aspect        | v1                                                       | v2                                                                 |
| ------------- | -------------------------------------------------------- | ------------------------------------------------------------------ |
| **Method**    | Pre-stored chunks passed to PersonalizationEngine        | Per-concept hybrid search via `hybrid_search()` RPC                |
| **Algorithm** | Chunks from document processing (no per-topic retrieval) | RRF: 70% vector similarity + 30% full-text search                  |
| **Top-K**     | All document chunks available                            | Top 8 per concept                                                  |
| **Embedding** | Uses stored embeddings (1536d)                           | Embeds concept query upfront with `text-embedding-3-large` (3072d) |

**Winner: v2.** Per-concept retrieval via hybrid search is fundamentally better than passing all document chunks. The LLM receives the 8 most relevant chunks for each concept instead of everything.

#### 9b. Concept Ordering

| Aspect             | v1                              | v2                                                          |
| ------------------ | ------------------------------- | ----------------------------------------------------------- |
| **Method**         | Syllabus order (LLM-determined) | Topological sort via Kahn's algorithm on prerequisite graph |
| **Guarantee**      | LLM's best judgment             | Mathematical guarantee that prerequisites generate first    |
| **Cycle handling** | N/A                             | Cyclic nodes appended at end                                |

**Winner: v2.** Deterministic ordering based on explicit prerequisite relations is more reliable than LLM-determined order.

#### 9c. Personalization

| Aspect                     | v1                                                                                                                                              | v2                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **Interest rotation**      | Blake2b deterministic hash selects 2-5 interests per lesson, ensuring variety across lessons                                                    | All persona interests passed every time          |
| **Weaving patterns**       | 5 patterns: HIGH_DETAIL, BALANCED, HIGH_ENGAGEMENT, SPIRAL, NARRATIVE — selected based on learning style and detail tolerance                   | None                                             |
| **Extended metaphor**      | Explicit prompt instruction: "ONE powerful metaphor from their interests that STRUCTURES the entire lesson" with detailed technique description | General "use interests as analogy domain"        |
| **Post-generation QA**     | `apply_post_generation_quality_passes()` — validates and cleans content after LLM generation                                                    | Trusts LLM output                                |
| **Interest enforcement**   | `repair_illegal_interests()` — detects unauthorized interest usage, makes LLM call to fix                                                       | None                                             |
| **Academic Guardian**      | `AcademicGuardian.validate_and_enhance()` — checks requirement coverage                                                                         | None                                             |
| **Content Weaver**         | Parses content sections, classifies types, calculates personalization score                                                                     | None                                             |
| **User instructions**      | Injected into prompt — students can guide topic focus                                                                                           | Not supported                                    |
| **Source citations**       | Explicit rules: "cite ONLY from source, NEVER fabricate" with examples                                                                          | Not addressed                                    |
| **Mastery check**          | Required closing section with self-test question                                                                                                | `key_takeaway` section required                  |
| **Quantitative detection** | `is_quantitative_topic()` gates worked examples and formula requirements                                                                        | Subject detection handles this at document level |

**Winner: v1 for personalization depth.** The interest rotation system (deterministic hash ensures different lessons feature different interests), weaving patterns, extended metaphor technique, and post-generation quality passes are all genuinely valuable.

**Important caveat:** Some v1 components are less sophisticated than their names suggest:

- `AcademicGuardian._check_requirement_coverage()` is keyword matching ("definition" in content? ✓), not LLM validation
- `ContentWeaver.determine_pattern()` is a simple if/else tree (5 branches based on learning style)
- The rhythm patterns defined in `ContentWeaver` are informational only — they don't enforce output structure

#### 9d. Prompt Engineering

| Aspect                | v1                                                                                                                                                                                                                              | v2                                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Structure**         | `PromptBuilder` assembles 10+ XML-tagged sections (task, thinking_instructions, learner_profile, interests, requirements, source_content, quality_examples, core_principles, formatting_standards, final_goal, metadata_output) | Single function `buildLessonPrompt()` with persona section, prerequisite section, chunks section, domain instructions, component rules |
| **Output format**     | Free-form markdown + metadata JSON block                                                                                                                                                                                        | Structured JSON with 12+ typed component specs enforced by Zod schema                                                                  |
| **Domain adaptation** | Quantitative vs qualitative branching in prompt                                                                                                                                                                                 | 8 domain-specific pedagogical frameworks injected from subject detection                                                               |
| **Examples**          | Quantitative and qualitative reference examples included in prompt                                                                                                                                                              | None                                                                                                                                   |
| **Thinking section**  | Optional `<thinking_instructions>` for planning visibility                                                                                                                                                                      | None                                                                                                                                   |
| **Length**            | ~4000-6000 tokens (very long)                                                                                                                                                                                                   | ~1500-2000 tokens (focused)                                                                                                            |

**Mixed.** v1's prompt is more comprehensive (examples, thinking section, citation rules). v2's prompt produces structured component output and has domain-specific pedagogy.

#### 9e. Output Format

| Aspect                   | v1                                   | v2                                                                                                                                                                                       |
| ------------------------ | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Format**               | Free-form markdown                   | Structured JSON with typed components                                                                                                                                                    |
| **Component types**      | Heading sections (implicit)          | 12+ explicit: text, concept_definition, process_flow, comparison_table, analogy_card, key_takeaway, mini_quiz, quote_block, timeline, concept_bridge, code_explainer, interactive_widget |
| **Validation**           | Post-generation regex/keyword passes | Zod schema enforcement at generation time                                                                                                                                                |
| **Interactive elements** | None                                 | `interactive_widget` — self-contained HTML/CSS/JS                                                                                                                                        |
| **Rendering**            | Markdown renderer                    | React component per type (LessonRenderer)                                                                                                                                                |

**Winner: v2.** Typed components enable richer, more interactive rendering. Each section type maps to a purpose-built React component. Interactive widgets allow live manipulation (sliders, graphs, simulations). Zod schema ensures valid output.

#### 9f. Concurrency & Performance

| Aspect                   | v1                                                 | v2                                                                          |
| ------------------------ | -------------------------------------------------- | --------------------------------------------------------------------------- |
| **Parallelism**          | 6 topics per document via `ParallelTopicProcessor` | 7 concepts per batch via `Promise.all`                                      |
| **Max duration**         | 120s timeout per LLM call                          | 900s (15 min) for entire job                                                |
| **Duplicate prevention** | Syllabus-based ordering                            | Checks `lesson_concepts` for existing bindings + 60s recent creation window |
| **Model**                | Claude Sonnet 4.5                                  | Claude Sonnet 4.6                                                           |
| **LLM retry**            | Via LLM client                                     | 2 attempts with catch-and-retry loop                                        |

**Tie.** Similar parallelism strategies. v2's duplicate prevention is more robust.

**Key files:**

- v1: `apps/backend/backend/services/generation/personalization_engine.py`, `apps/backend/backend/services/generation/prompt_builder.py`, `apps/backend/backend/services/generation/content_weaver.py`, `apps/backend/backend/services/core/lesson_generation.py`
- v2: `trigger/src/jobs/generate-lessons.ts`, `trigger/src/lib/prompts/lesson-generation.v1.ts`, `trigger/src/lib/prompts/domains/index.ts`

---

### 10. Real-Time Progress

| Aspect                 | v1                                                                                                                                                                                                                                                         | v2                                              |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| **Mechanism**          | SSE with Redis-backed event queues                                                                                                                                                                                                                         | Trigger.dev job status polling via `jobs` table |
| **Granularity**        | 15+ event types: `processing_started`, `text_extraction_complete`, `chunking_complete`, `embeddings_stored`, `topics_extracted`, `topic_discovered`, `syllabus_ready`, `lesson_generation_started`, `lesson_ready`, `lesson_stored`, `processing_complete` | Job progress 0-100%                             |
| **Per-lesson updates** | Yes — client receives each lesson as it completes                                                                                                                                                                                                          | No — client polls job status                    |

**Winner: v1.** SSE streaming with per-stage, per-lesson events provides dramatically better UX. Students see progress in real time — "Discovered 5 topics", "Lesson 3 ready" — vs a progress bar.

**Key files:**

- v1: `apps/backend/backend/services/core/processing_stages.py` (event emissions throughout)
- v2: `trigger/src/jobs/process-document.ts` (progress updates to `jobs` table)

---

### 11. AI Observability

| Aspect              | v1                          | v2                                                                                                                                |
| ------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Tracking table**  | No centralized table        | `ai_requests` table                                                                                                               |
| **Fields tracked**  | —                           | model, provider, prompt_tokens, completion_tokens, cost_usd, latency_ms, task_name, prompt_version, validation_passed, was_cached |
| **Proxy**           | Direct API calls            | Helicone proxy for all LLM calls                                                                                                  |
| **Cost alerts**     | $5/doc, $100/day thresholds | Per-call cost calculation                                                                                                         |
| **Tracked clients** | `TrackedLLMClient` wrapper  | `recordAiRequest()` helper                                                                                                        |

**Winner: v2.** Centralized `ai_requests` table with per-call tracking enables cost analysis, quality correlation with prompt versions, and latency monitoring. Helicone adds a second layer of observability.

v1 has cost alert thresholds which v2 lacks — but v2's per-call data makes it trivial to add.

---

## Summary Table

| Stage                  | Winner | Confidence | Key Differentiator                                                                                                                                        |
| ---------------------- | ------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Upload                 | **v2** | High       | Two-phase signed URL, more formats                                                                                                                        |
| Text Extraction        | **v2** | Medium     | v2 now tracks page boundaries for PDF/PPTX + has OCR fallback, PPTX, HTML. v1's heading hierarchy is deeper but v2's enrichment compensates.              |
| Chunking               | **v2** | Medium     | v2 now preserves code fences and markdown tables as atomic blocks. Sentence-awareness deemed unnecessary per 2026 benchmarks given contextual enrichment. |
| Chunk Enrichment       | **v2** | High       | Contextual retrieval (v1 has no equivalent)                                                                                                               |
| Embeddings             | **v2** | High       | `text-embedding-3-large` (3072d) vs `small` (1536d)                                                                                                       |
| Subject Detection      | **v2** | High       | Domain/pedagogy detection (v1 has no equivalent)                                                                                                          |
| Concept Extraction     | **v2** | Medium     | Knowledge graph with typed relations                                                                                                                      |
| Syllabus               | **v2** | Medium     | Cleaner data model, versioning                                                                                                                            |
| Lesson Personalization | **v1** | Medium     | Interest rotation, weaving patterns, extended metaphor                                                                                                    |
| Lesson Retrieval       | **v2** | High       | Per-concept hybrid search vs pre-stored chunks                                                                                                            |
| Lesson Output Format   | **v2** | High       | 12+ typed components vs markdown                                                                                                                          |
| Domain Pedagogy        | **v2** | High       | 8 frameworks vs quant/qual branching                                                                                                                      |
| Real-Time Progress     | **v1** | High       | SSE streaming vs job polling                                                                                                                              |
| Observability          | **v2** | High       | Per-call tracking + Helicone                                                                                                                              |

---

## What v2 Should Port from v1

Ordered by impact × effort ratio:

### Tier 1 — High Impact, Moderate Effort

1. ~~**Structured text extraction**~~ ✅ **DONE (PR #14).** Page boundaries tracked for PDF (per-page from unpdf) and PPTX (per-slide). `page_number` stored on chunks. Chat routes include `[p.12]` in chunk labels. Full DocumentParser port deemed unnecessary — contextual enrichment compensates for heading hierarchy, per 2026 RAG benchmarks.

2. ~~**Sentence-aware chunking**~~ ✅ **DONE (PR #14).** Structure-preserving splits: code fences and markdown tables are atomic (never split). Sentence-boundary awareness skipped — 2026 benchmarks show fixed-size 512-token splitting outperforms semantic chunking by 15pts, and contextual enrichment reduces retrieval failure by 49-67% regardless of boundary quality (Anthropic, Firecrawl, Chroma Research).

3. **Interest rotation** — Port the Blake2b deterministic hash for interest selection. ~30 lines of code, guarantees different lessons feature different interests from the student's profile. Currently v2 passes all interests every time.

### Tier 2 — Medium Impact, Low Effort

4. **Extended metaphor prompt technique** — Add to lesson prompt: "Pick ONE interest that illuminates this topic. Build a single metaphor that structures the entire lesson." v1's prompt section on this is well-written and can be adapted directly.

5. **Source citation rules** — Add to lesson prompt: explicit rules about citing only from retrieved chunks, never fabricating citations. v1's prompt has good positive/negative examples.

6. **User instructions** — Allow students to provide guidance on what to focus on or how to approach topics. Requires: field on `workspace_documents.metadata`, piped through to lesson prompt.

### Tier 3 — Medium Impact, Higher Effort

7. **SSE real-time progress** — Replace job polling with Server-Sent Events for pipeline progress. Requires: SSE endpoint, event emission at each pipeline stage. Significant UX improvement.

8. **Admin/exam document filtering** — Detect non-learnable content (syllabi, exam papers, admin docs) and skip lesson generation. v1 uses filename pattern matching + AI classification.

9. **Post-generation quality passes** — Validate lesson content after generation: check for unfilled placeholders, quantitative topics have formulas, key takeaways present. v1's implementation is regex-based and lightweight.

### Completed (not from v1 — discovered during review)

10. ~~**Enriched content retrieval**~~ ✅ **DONE (PR #14).** Chat routes were selecting raw `content` from chunks, discarding the `enriched_content` (contextual prefix) that was computed during processing. Fixed: all chat routes now use `enriched_content || content`, giving the LLM the full contextual embedding text. This was a bug, not a port — the enrichment was computed and stored but never read at retrieval time.

### Not Worth Porting

- **AcademicGuardian** — Keyword-matching validation. v2's Zod schema enforcement is more reliable.
- **ContentWeaver pattern selection** — Simple if/else tree. The patterns are informational, not enforced.
- **Visual generation** — v2's `interactive_widget` component type is architecturally superior to v1's image generation approach.
- **Weaving pattern rhythm definitions** — Never enforced on output. Just prompt decoration.

---

## Architecture Comparison

### v1: In-Process Pipeline

```
FastAPI request → asyncio.create_task(process_document)
  → Stage 1: Extract (in-process)
  → Stage 2: Chunk (in-process)
  → Stage 3+4: Embed + Topics (asyncio.gather)
  → Stage 5: Concept overlap (in-process)
  → Stage 5.5: Syllabus (in-process)
  → Stage 6: Lessons (ParallelTopicProcessor, up to 6 concurrent)
  → SSE events streamed throughout
```

**Pros:** Low latency between stages. Rich SSE progress streaming. All state in `ProcessingContext` object.
**Cons:** Worker process holds the task — crash = lost work. No retry. No job observability dashboard.

### v2: Job Chain Pipeline

```
tRPC mutation → Trigger.dev tasks.trigger('process-document')
  → process-document job: Extract → Chunk → Enrich → Embed → Store
      → triggers extract-concepts
          → triggers generate-syllabus
              → triggers generate-lessons
```

**Pros:** Crash-safe — Trigger.dev retries failed jobs. Each stage independently retryable. Job dashboard for observability.
**Cons:** Higher latency between stages (job scheduling overhead). Progress limited to job-level polling.

**Verdict:** v2's architecture is more production-ready. v1's SSE streaming is better UX but the reliability tradeoff favors v2.
