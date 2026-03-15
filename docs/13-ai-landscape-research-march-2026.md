# AI Landscape Research — March 2026

> Research conducted March 14, 2026. This document captures the current state of AI techniques, tools, models, and patterns relevant to building LEARN-X's architecture.

---

## 1. RAG: Evolution, Not Death

### The Verdict

"Naive RAG is dead, sophisticated RAG is thriving." The viral "RAG is dead" claims from early 2026 are wrong in practice. RAG framework usage surged 400% since 2024. The real shift: RAG is evolving from a fixed pipeline into a **context engine** with intelligent retrieval at its core.

### Cost Settles the Debate

| Approach | Avg Cost Per Query | At Scale (1K queries/day) |
|----------|-------------------|---------------------------|
| RAG (hybrid search) | ~$0.00008 | ~$2.40/month |
| Long context (1M tokens) | $2–$10 | $60K–$300K/month |

RAG is **1,250× cheaper per query**. At any real user scale, long-context-only is not viable for large corpora.

### When Long Context Wins

For knowledge bases under ~200K tokens (a short textbook chapter, a lecture handout), full-context prompting + prompt caching is now faster and cheaper than building retrieval infrastructure. Anthropic explicitly recommends this for small document sets.

**Implication for LEARN-X:** Add a document size gate early in the ingestion pipeline. Under ~80K tokens → skip chunking, use full-context. Over → proceed with hybrid search pipeline.

### The "Lost in the Middle" Problem

Models show 10–20+ percentage point accuracy drops for information in the middle of long contexts. This is caused by Rotary Position Embedding (RoPE) decay. Effective context capacity is ~60–70% of advertised maximum. This alone justifies RAG for precision-critical retrieval.

---

## 2. Agentic RAG: The New Architecture

### What Changed

Classic RAG: embed → retrieve → generate (static pipeline).
Agentic RAG: an agent **decides** whether, what, and how to retrieve — then grades retrieval quality and retries if poor.

### Concrete Patterns

**Corrective RAG (CRAG)**
- Uses a lightweight retrieval evaluator (fine-tuned T5-large)
- Three corrective paths: augment via web search, decompose-then-recompose, or filter irrelevant info
- Returns confidence scores that trigger different knowledge retrieval actions
- Plug-and-play with any RAG approach

**Self-RAG**
- Special reflection tokens built into the model: ISREL (relevance), ISSUP (evidence support)
- Model learns when to retrieve on-demand (not every query)
- Model critiques its own retrieved results
- Better factuality and citation accuracy for long-form generation

**Adaptive RAG**
- Analyzes incoming query complexity to determine retrieval strategy
- Simple queries skip retrieval entirely; complex queries trigger multi-hop reasoning
- Improves efficiency by avoiding unnecessary retrieval

**A-RAG (February 2026)**
- Exposes three hierarchical retrieval tools to the agent: keyword search, semantic search, chunk read
- Agent adaptively searches across multiple granularities
- 5–13% better QA accuracy vs. flat retrieval with comparable token usage

### GraphRAG

Knowledge graph-based RAG addresses multi-hop reasoning that flat retrieval struggles with. Three innovations: graph-structured knowledge representation, graph-aware retrieval (multi-hop), and structure-guided search.

**Cost reality:** Knowledge graph extraction costs 3–5× more upfront (LLM-based entity/relationship extraction) but enables better performance on complex reasoning queries.

**LinearRAG (ICLR 2026):** Lightweight entity recognition + semantic linking with zero LLM token consumption during retrieval. Linear complexity.

**Implication for LEARN-X:** The concept extraction pipeline already builds a concept graph. Making it queryable as part of retrieval (not just for lesson ordering) would enable multi-hop reasoning in chat.

---

## 3. Contextual RAG (Anthropic's Approach)

### The Technique

Before embedding a chunk, use an LLM to generate 50–100 tokens of context explaining where the chunk fits within the overall document. Prepend this context to the chunk before embedding AND before BM25 indexing.

### Performance

- Contextual Embeddings alone: **35% reduction** in retrieval failures
- Contextual Embeddings + Contextual BM25: **49% reduction**
- Adding reranking on top: **67% reduction** in retrieval failures

### Cost Optimization

Claude prompt caching makes this affordable: cache the full document once (25% premium), then read from cache for each chunk contextualization (10% of base price). 61–77% of input tokens hit cache at 90% discount.

**Implication for LEARN-X:** This is a high-impact, low-complexity improvement to the chunking pipeline. During ingestion, contextualize each chunk before embedding. The prompt caching economics make it viable at scale.

---

## 4. Retrieval: Hybrid Search Best Practices

### Current Best Practice Pipeline

1. **Parallel retrieval:** BM25 (sparse/keyword) + Vector search (dense/semantic) run simultaneously
2. **Fusion:** Reciprocal Rank Fusion (RRF) combines scores from both rankings
3. **Reranking:** Cross-encoder model re-ranks top candidates

This is exactly what the LEARN-X architecture specifies. The current design is aligned with best practice.

### Reranking

Rule: Only layer in reranker **after** recall@50 is solid (>90%). Premature reranking on weak recall wastes compute.

### Late Chunking

Defer chunking: feed entire document to embedding model, generate token-level embeddings, then pool into chunk embeddings. Captures cross-chunk context without LLM calls. Requires long-context embedding models. +24.47% improvement on MTEB benchmarks.

### ColBERT / ColPali

**ColBERT:** Keeps token-wise representations (multi-vector) rather than pooling into single vector. Late interaction matching at retrieval time.

**ColPali (ICLR 2025):** Treats PDFs as images instead of requiring OCR + chunking. Uses PaliGemma-3B vision-language model to generate ColBERT-style multi-vector embeddings from page images. No OCR, no chunking, end-to-end trainable. Outperforms modern document retrieval pipelines.

**Implication for LEARN-X:** ColPali could simplify the PDF ingestion path dramatically — skip LlamaParse entirely for visual documents (slides, diagrams, tables). Worth evaluating for Phase 2.

---

## 5. Context Engineering: The New Discipline

### Definition

Context engineering is the systematic design of what information an AI model has access to when generating a response. It replaces "prompt engineering" as the primary skill. Coined by Phil Schmid (2024–2025), elevated by Andrej Karpathy, formalized by Gartner in July 2025: "context engineering is in, prompt engineering is out."

### Token Budget Allocation (Google DeepMind Research)

| Component | Budget | Notes |
|-----------|--------|-------|
| System Instructions | 10–15% | Disproportionate influence on behavior |
| Tool Context | 15–20% | Model performance degrades with poor tool descriptions |
| Knowledge Context | 30–40% | Retrieved documents, domain knowledge |
| History Context | 20–30% | Conversation history, grows over time |

Models do NOT use context uniformly — critical information should appear early. Performance becomes unreliable as input grows, particularly for mid-document reasoning.

### Production Strategies

- **Dynamic allocation:** Adjust context budget per query based on conversation state (not fixed allocations)
- **Graceful exceedance:** Intelligent truncation, automatic summarization when context fills
- **Cost optimization:** Inefficient context management is a major expense driver

**Implication for LEARN-X:** The persona context system needs explicit token budgets. System instructions + persona (Layers 1–4) + retrieved chunks + conversation history should be budgeted, not left to hope. Build a `ContextBudget` utility that enforces allocation.

---

## 6. Memory Architecture: The Four Types

### Industry-Standard Taxonomy

| Type | Definition | LEARN-X Equivalent |
|------|-----------|-------------------|
| **Working Memory** | Current context window | Current chat session |
| **Episodic Memory** | Specific past interactions | Chat session history (partial) |
| **Semantic Memory** | Summarized knowledge about the user | Persona Layers 1–3 |
| **Procedural Memory** | Learned behavioral patterns | Persona Layer 4 (framing), persona versioning |

LEARN-X has all four types but they're named differently and scattered. Mapping them explicitly will clarify the architecture diagram.

### Memory Products (State of the Market)

| Product | Focus | Status |
|---------|-------|--------|
| **Mem0** | Memory as a product; graph memory (Jan 2026) | Series A ($24M), production-ready |
| **Zep** | Temporal knowledge graph; tracks how facts change over time | Enterprise-ready |
| **Letta (MemGPT)** | Explicit agent state with editable memory blocks | SaaS still developing |
| **Cognee** | Graph-aware embeddings fusing semantics with graph signals | Agent memory upgrades Sep 2025 |

### Conversation History Management

Three approaches in production:

1. **Sliding window:** Keep last k messages, drop older. Cheap but loses important context.
2. **Summarization:** Compress older messages into running summary, keep recent verbatim. Emerging standard.
3. **Hierarchical memory:** Multi-level (immediate → compressed summaries → long-term semantic). Most sophisticated.

**Advanced patterns:** MemGAS learns optimal retrieval granularity via entropy-based routing. H²Memory uses four components (situation, background, topic-outlines, principles). Smart memory systems cut token costs by 80–90% while improving response quality.

**Implication for LEARN-X:** The chat system needs a conversation history management strategy. For MVP, summarization is the right call: keep last 10 messages verbatim, summarize everything prior. Phase 2 can add hierarchical memory.

---

## 7. Prompt Caching: Architecture Changer

### Anthropic Claude Prompt Caching

- **Cost savings:** Up to 90% reduction on cached content
- **Latency:** Up to 85% faster time-to-first-token
- **Pricing:** Cache writes: 25% premium; Cache reads: 10% of base price
- **TTL:** 5-minute standard (refreshes on reuse); 1-hour option available
- **Implementation:** Manual via `cache_control` parameter

### OpenAI Prompt Caching

- **Threshold:** 1,024+ tokens for cache eligibility
- **Benefits:** Up to 80% latency reduction, 50% cost savings
- **Advantage:** No code changes required — automatic

### Architectural Impact

This changes how to think about system prompts and persona context. Long, stable system instructions + persona context can be cached. Only the query-specific parts (retrieved chunks, user message) change per request.

**Implication for LEARN-X:** The persona context (Layers 1–4) is relatively stable across a session. Structure the prompt so persona context comes first (cacheable), followed by retrieved chunks and the user query (variable). This could reduce per-query cost by 50–90% on the persona portion.

---

## 8. Model Landscape: March 2026

### Flagship Models

| Model | Context | Pricing (in/out per MTok) | Key Strength |
|-------|---------|--------------------------|--------------|
| **Claude Opus 4.6** | 200K (1M GA, no premium) | $5 / $25 | Best autonomous agent; adaptive reasoning (4 effort levels); SWE-bench 76.8% |
| **Claude Sonnet 4.6** | 200K (1M GA) | $3 / $15 | Near-Opus performance at lower cost |
| **GPT-5.4** | 272K (1M experimental) | $2.50 / $15 | Enhanced tool use; SWE-Bench Pro 57.7% |
| **Gemini 3.1 Pro** | 1M (2M experimental) | Competitive | Multimodal native |

### Value Tier

| Model | Pricing (in/out per MTok) | Key Strength |
|-------|--------------------------|--------------|
| **DeepSeek V3.2** | $0.14 / $0.28 | MIT license; MMLU 94.2%; 50× cheaper than GPT-5.4 |
| **Mistral Medium 3.1** | $0.40 / — | 90% of Sonnet quality; self-hostable on 4 GPUs |
| **Gemini Flash-Lite** | $0.10 / $0.40 | Budget multimodal |
| **Mistral Nemo** | $0.02 / $0.04 | Cheapest option |

### Key Pricing Trends

- Flagship prices dropping 40–60% per generation
- Output tokens cost 2–8× more than input (median 4×)
- Claude Opus 4.6 dropped from $15/$75 to $5/$25 (67% reduction)
- Open-source (DeepSeek, Llama 4) disrupting economics fundamentally

### Embedding Models

| Model | MTEB Score | Pricing | Notes |
|-------|-----------|---------|-------|
| **Gemini Embedding 001** | 68.32 | $0.004/1K tokens | Leader; multimodal (text, image, video, audio, PDF) |
| **Voyage-4** | 68.6 | $0.06/MTok | Strong alternative |
| **Voyage-3-Large** | 66.8 | $0.06/MTok | 200M free tokens/account |
| **Cohere Embed v4** | 65.2 | $0.12/MTok | Only multimodal commercial option |
| **text-embedding-3-large** | 64.6 | $0.13/MTok | Current LEARN-X choice |
| **Qwen3-Embedding-8B** | 70.58 (multilingual) | Free (Apache 2.0) | Best open-source |

**Implication for LEARN-X:** text-embedding-3-large (MTEB 64.6) is now behind Gemini Embedding 001 (68.32) and Voyage-4 (68.6). Not an urgent migration, but for new projects starting fresh, Gemini or Voyage would be the better default. The Vercel AI SDK supports all of these.

---

## 9. Model Routing: Multi-Provider Architecture

### Why It Matters

- Cost reduction: 50–80% with minimal quality impact
- 37% of enterprises now use 5+ models in production
- Single-provider lock-in is a recognized anti-pattern

### Routing Strategies

**Cost-Based:** Route 80% of queries to cheaper models, 20% to premium. Customer support chatbot example: 100K daily requests costs $1,500 with routing vs. $7,500+ without.

**Task-Based:** Match models to task difficulty. Code queries → code-specialized model. Simple FAQ → budget model. Complex reasoning → premium model.

**Quality-Based:** Monitor quality metrics per route, adjust dynamically. Implement fallback chains for provider outages.

### Infrastructure

| Platform | Strength | Best For |
|----------|----------|----------|
| **Bifrost** (Maxim AI) | Go-based, <11µs overhead, 50× faster than LiteLLM | High-performance production |
| **Helicone** | Rust-based, native observability | Observability-first production |
| **Portkey** | Enterprise controls, compliance | Regulated industries |
| **LiteLLM** | 100+ providers, Python | Prototyping (fails at 500+ RPS) |
| **OpenRouter** | Managed, easy | Quick start (5% markup) |

### Vercel AI SDK (Current State)

- 50+ AI providers supported (official + community)
- Vercel AI Gateway: unified access to hundreds of models
- Seamless provider switching via single line code change
- SDK v6.x active (March 2026)

**Implication for LEARN-X:** Redesign the model routing table as provider-agnostic slots:

```
LESSON_GENERATION_MODEL = "claude-opus-4-6"      // or "gpt-5.4" or "gemini-3.1-pro"
FAST_GENERATION_MODEL = "gemini-flash-lite"       // or "gpt-4o-mini" or "deepseek-v3.2"
CONCEPT_EXTRACTION_MODEL = "claude-sonnet-4-6"    // or "gpt-5.4"
EMBEDDING_MODEL = "text-embedding-3-large"        // or "gemini-embedding-001"
CHAT_MODEL = "claude-sonnet-4-6"                  // or "gpt-5.4"
```

This makes multi-provider testing a config change, not a code change.

---

## 10. Agentic Patterns & Frameworks

### Dominant Frameworks

| Framework | Strength | Production Status |
|-----------|----------|-------------------|
| **LangGraph** | Stateful workflows, conditional routing, human-in-the-loop | Production-ready |
| **OpenAI Agents SDK** | Minimalist (Agents, Handoffs, Guardrails); provider-agnostic | 19K+ GitHub stars |
| **CrewAI** | Multi-agent collaboration, role-based orchestration | Production-ready |
| **AutoGen v0.4 (AG2)** | Event-driven, async, OpenTelemetry built-in | Enterprise-ready |

### The ReAct Pattern (Industry Standard)

Thought → Action → Observation → Loop Decision. This is the gold standard for agentic systems. Every major framework implements variants of this through tool calling.

### Workflow Patterns (from Anthropic's Guide)

| Pattern | When to Use |
|---------|-------------|
| **Prompt Chaining** | Sequential steps, well-defined |
| **Routing** | Classify input → delegate to specialized handler |
| **Parallelization** | Independent subtasks (sectioning or voting) |
| **Orchestrator-Workers** | Unpredictable complexity, dynamic task breakdown |
| **Evaluator-Optimizer** | Iterative refinement through feedback loops |

### MCP (Model Context Protocol)

- 97 million monthly SDK downloads
- 10,000+ active servers deployed
- Adopted by OpenAI (March 2025), donated to Linux Foundation (December 2025)
- Co-founded by Anthropic, Block, OpenAI; supported by Google, Microsoft, AWS
- Solves the N×M integration problem: M+N implementations instead of M×N

### AI Observability

| Tool | Strength |
|------|----------|
| **Langfuse** | Open-source, self-hostable, tracing + evals (LEARN-X current choice) |
| **LangSmith** | LangChain-native, visual execution traces |
| **Braintrust** | 80× faster queries, CI/CD-tied evals |
| **Helicone** | AI Gateway + observability + caching |
| **Arize** | Enterprise ML observability, drift detection |

**Implication for LEARN-X:** Langfuse remains a solid choice for observability. For the chat system specifically, consider whether a ReAct-style loop (decide to retrieve → grade → retry) would improve quality over the current single-pass pipeline. Start with single-pass for MVP, plan the agent loop for Phase 2.

---

## 11. Structured Outputs (2026 Best Practice)

### The Shift

**JSON Mode (legacy):** Guarantees valid JSON only, no schema adherence.
**Strict Mode with json_schema (production default):** Guarantees both valid JSON AND schema adherence.

- GPT-5.2 JSON reliability: 92% (up from 82% on GPT-5.1)
- Schema-first development: Define Pydantic/Zod schemas first, build prompts around them
- Vercel AI SDK's `generateObject` already supports this pattern

**Implication for LEARN-X:** The `generateObject` pattern used in concept extraction is correct and forward-aligned. Extend this to ALL structured generation (lessons, quizzes, flashcards). Never use free-form JSON parsing.

---

## 12. AI in Education: What's Working

### Harvard 2025 Study (Randomized Controlled Trial)

- Students learn **significantly more in less time** with AI tutors vs. in-class active learning
- Effect size: 0.73–1.3 standard deviations (well above 0.4 SD significance threshold)
- Time efficiency: 49 minutes (AI) vs. 60 minutes (in-class) for same learning
- Greater engagement, higher motivation, better knowledge transfer

### Critical Finding: Pedagogy Matters More Than AI

- **Without pedagogical design:** AI tools improve task performance but produce NO sustained learning gains
- **With intentional pedagogy:** AI tools designed with learning science principles show sustained improvements
- Students using generic AI chatbots performed better on assignments but the advantage **disappeared on exams**
- Pedagogically-designed AI tools maintained gains beyond tool removal

### What Leading Platforms Are Doing

**Khanmigo (Khan Academy)**
- 700,000 K-12 students (projected 1M+ in 2025-26)
- Socratic dialogue: GPT-4 prompted to ask guiding questions, never give answers
- Personalization via interests: analyzes chat history to identify learner passions
- $4/month or $44/year for parents/learners; free for teachers

**Duolingo**
- Birdbrain algorithm: logistic regression inspired by Item Response Theory (IRT)
- Predicts probability of success on any exercise, estimates both difficulty and proficiency
- Updates both estimates after every completed exercise
- Session generator rewrite: 750ms → 14ms exercise delivery for real-time personalization
- Content generation: instructional designers create "Mad Libs" prompt templates, AI generates variations, auto-localizes to dozens of languages

**NotebookLM (Google)**
- Document-grounded AI: generates summaries, quizzes, discussion questions from uploaded materials
- Audio Overviews: converts documents to podcast-style AI discussions
- Video Overviews (2025): slide-style videos with narration
- Shift from passive assistant to active agent (Gemini 3 reasoning)

### Effective AI Tutoring Techniques

1. **Socratic dialogue:** Guide to answers, never give them directly
2. **Misconception detection:** System prompts include question text + student's incorrect answer + specific misconception diagnosis
3. **Item Response Theory:** Model response probability based on learner ability vs. item difficulty
4. **Deep Knowledge Tracing:** Bidirectional transformers + graph attention → 87.5% prediction accuracy, 24.6% learning efficiency improvement
5. **Spaced repetition integration:** Adaptive spacing intervals based on mastery progression

### Knowledge Graphs in Education

- Prerequisite dependency relationships map concept nodes
- AI automatically identifies and maps concept connections
- Enable personalized alternative learning routes
- CSEAL framework: knowledge-tracing module + prerequisite-successor relationships + visualization

**Implication for LEARN-X:** The pedagogical design is the differentiator, not the AI itself. The persona system (adaptive explanation depth, Socratic prompting, interest-based framing) is the core value proposition. The concept graph + prerequisite ordering is validated by current research. Consider adding explicit misconception detection to the chat system prompt.

---

## 13. Key Architecture Decisions Before Diagramming

Based on this research, these decisions affect the shape of the architecture:

### Decision 1: Document Size Gate

Add an early branch in the ingestion pipeline:
- Under ~80K tokens → store as single document, use full-context generation with prompt caching
- Over ~80K tokens → proceed with chunking + hybrid search pipeline

### Decision 2: Contextual Chunking

During ingestion, for documents that go through chunking: use an LLM to generate 50–100 token context per chunk before embedding. Cache the full document to make this cost-effective. 49% retrieval failure reduction.

### Decision 3: Provider-Agnostic Model Routing

Replace hardcoded model names with named slots. Use Vercel AI SDK's provider switching. Add Helicone or Bifrost as a routing/observability layer.

### Decision 4: Chat Architecture (Phase 1 vs. Phase 2)

- Phase 1: Single-pass pipeline (embed query → hybrid search → generate). Ship fast.
- Phase 2: Corrective RAG loop (embed → retrieve → grade quality → retry if poor → generate). Low complexity, high impact.

### Decision 5: Token Budget System

Build a `ContextBudget` utility that explicitly allocates tokens:
- System instructions: ~2K tokens
- Persona context (all 4 layers): ~2K tokens (cached)
- Retrieved chunks: ~4K tokens
- Conversation history: ~4K tokens (summarized beyond last 10 messages)
- Response headroom: remaining

### Decision 6: Memory Strategy

- Working memory: current context window
- Episodic memory: chat session history (summarize older messages)
- Semantic memory: Persona Layers 1–3 (stored in DB, versioned)
- Procedural memory: Persona Layer 4 framing rules + persona versioning

### Decision 7: Concept Graph as Retrieval Source

Make the concept graph queryable during chat retrieval, not just for lesson ordering. This enables multi-hop reasoning ("how does X relate to Y we covered last week?").

---

## Sources

### RAG Evolution
- [Agentic Retrieval-Augmented Generation: A Survey](https://arxiv.org/abs/2501.09136)
- [A-RAG: Scaling Agentic Retrieval via Hierarchical Interfaces](https://arxiv.org/abs/2602.03442)
- [Corrective Retrieval Augmented Generation](https://arxiv.org/abs/2401.15884)
- [Self-RAG: Learning to Retrieve, Generate, and Critique](https://arxiv.org/abs/2310.11511)
- [Anthropic Contextual Retrieval](https://www.anthropic.com/news/contextual-retrieval)
- [ColPali: Efficient Document Retrieval with Vision Language Models](https://arxiv.org/abs/2407.01449)
- [Late Chunking: Contextual Chunk Embeddings](https://arxiv.org/abs/2409.04701)
- [GraphRAG-Bench](https://arxiv.org/abs/2506.05690)
- [LinearRAG: Efficient Graph RAG](https://github.com/DEEP-PolyU/LinearRAG)

### Context Engineering & Memory
- [Context Engineering: Why It's Replacing Prompt Engineering — Gartner](https://www.gartner.com/en/articles/context-engineering)
- [The Rise of Context Engineering — LangChain Blog](https://blog.langchain.com/the-rise-of-context-engineering/)
- [Context Window Management Strategies](https://www.getmaxim.ai/articles/context-window-management-strategies-for-long-context-ai-agents-and-chatbots/)
- [Memory in the Age of AI Agents: A Survey](https://github.com/Shichun-Liu/Agent-Memory-Paper-List)
- [Anthropic Prompt Caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
- [Context Management for Deep Agents — LangChain](https://blog.langchain.com/context-management-for-deepagents/)
- [LLM Chat History Summarization Guide — Mem0](https://mem0.ai/blog/llm-chat-history-summarization-guide-2025)
- [Native Sparse Attention (DeepSeek-AI)](https://arxiv.org/abs/2502.11089)
- [LLMLingua Prompt Compression](https://github.com/microsoft/LLMLingua)

### Model Landscape
- [LLM Pricing Comparison 2026](https://www.cloudidr.com/blog/llm-pricing-comparison-2026)
- [Gemini Embedding: Generalizable Embeddings](https://arxiv.org/html/2503.07891v1)
- [Embedding Models Comparison 2026](https://reintech.io/blog/embedding-models-comparison-2026-openai-cohere-voyage-bge)
- [Bifrost: 50× Faster Than LiteLLM](https://www.getmaxim.ai/blog/bifrost-a-drop-in-llm-proxy-40x-faster-than-litellm/)
- [Intelligent LLM Routing: Multi-Model AI Cuts Costs by 85%](https://www.swfte.com/blog/intelligent-llm-routing-multi-model-ai)
- [Claude Opus 4.6 Adaptive Reasoning](https://www.infoq.com/news/2026/03/opus-4-6-context-compaction/)

### Agentic Patterns
- [Building Effective Agents — Anthropic](https://www.anthropic.com/engineering/building-effective-agents)
- [Effective Context Engineering for AI Agents — Anthropic](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Code Execution with MCP — Anthropic](https://www.anthropic.com/engineering/code-execution-with-mcp)
- [A Year of MCP: From Experiment to Industry Standard](https://www.pento.ai/blog/a-year-of-mcp-2025-review)
- [OpenAI Agents SDK Review](https://mem0.ai/blog/openai-agents-sdk-review)
- [AI Agent Evaluation Guide](https://www.xugj520.cn/en/archives/ai-agent-evaluations-guide-2025.html)
- [State of Agent Engineering — LangChain](https://www.langchain.com/state-of-agent-engineering)

### AI in Education
- [Harvard AI Tutoring Study 2025](https://www.nature.com/articles/s41598-025-97652-6)
- [Duolingo Birdbrain Algorithm](https://blog.duolingo.com/learning-how-to-help-you-learn-introducing-birdbrain/)
- [Deep Knowledge Tracing with Dual-Stream Networks](https://www.nature.com/articles/s41598-025-10497-x)
- [Quality Assessment Framework for AI-Generated Educational Resources](https://www.mdpi.com/2079-8954/13/3/174)
- [OECD Digital Education Outlook 2026](https://www.oecd.org/content/dam/oecd/en/publications/reports/2026/01/oecd-digital-education-outlook-2026_940e0dd8/062a7394-en.html)
- [Three Best Uses of AI in Education 2026](https://etcjournal.com/2026/03/02/three-best-uses-of-ai-in-education-in-2026/)
- [Knowledge Graph-Powered AI in Education](https://chanzuckerberg.com/blog/knowledge-graph-ai-education/)
