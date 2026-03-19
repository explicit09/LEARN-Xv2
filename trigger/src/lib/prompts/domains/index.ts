/**
 * Domain-specific pedagogical instructions for lesson generation.
 * Each domain exports component emphasis, scaffolding rules, and teaching framework.
 * These get injected into the lesson prompt based on detected workspace domain.
 */

export interface DomainConfig {
  /** Human label for logging */
  label: string
  /** Pedagogical framework name */
  framework: string
  /** Domain-specific instructions injected into the lesson prompt */
  instructions: string
}

const CS_PROGRAMMING: DomainConfig = {
  label: 'Computer Science / Programming',
  framework: 'PRIMM',
  instructions: `
DOMAIN: Computer Science / Programming
FRAMEWORK: PRIMM (Predict → Run → Investigate → Modify → Make)

Domain-specific rules:
- Use code_explainer for EVERY algorithm, data structure, or code concept. Show real code, not pseudocode.
- Before showing code output, ask the student to PREDICT what it will do (use mini_quiz with "What will this code print?").
- Use process_flow for algorithms — show execution step by step with variable state changes.
- Use interactive_widget for visualizations: sorting algorithms, tree traversals, memory layouts, register states.
- Use comparison_table to contrast similar constructs (for vs while, stack vs queue, pass-by-value vs reference).
- Include debugging scenarios: show code with a subtle bug, ask student to find it.
- Scaffolding: READ code before WRITING code. Show complete examples first, then ask to modify.
- Avoid pure theory without code. Every concept must have a runnable example.
- Use concept_bridge to show how this concept connects to system design or real applications.`,
}

const MATH: DomainConfig = {
  label: 'Mathematics',
  framework: 'Worked Examples',
  instructions: `
DOMAIN: Mathematics
FRAMEWORK: Worked Examples with Progressive Abstraction

Domain-specific rules:
- Start CONCRETE (specific numbers, visual examples), then GENERALIZE to the abstract rule/theorem.
- Use process_flow for step-by-step problem solving. Show EVERY algebraic step with WHY annotations.
- Use interactive_widget for geometric intuition: graphs, transformations, function visualizations.
- Use concept_definition with etymology when introducing notation (e.g., why we use Σ for summation).
- Surface common misconceptions EXPLICITLY — don't just teach the right way, address the wrong ways students typically think.
- Use comparison_table to contrast similar concepts (e.g., permutations vs combinations, convergence vs divergence).
- Include at least 2 worked examples before any mini_quiz. Alternate: worked example → practice → worked example → practice.
- Use analogy_card sparingly — math analogies should illuminate, not oversimplify.
- Proofs: break into logical steps with justification for each. Use process_flow, not text blocks.
- code_explainer: ONLY use when the source material explicitly involves computation (statistics with R/Python, numerical methods, etc.). Pure math lessons (proofs, theorems, algebra) should NOT include code. The math IS the content — don't translate it into Python.
- End with key_takeaway that includes both the WHAT (formula/theorem) and the WHEN (when to use it).`,
}

const LAB_SCIENCES: DomainConfig = {
  label: 'Lab Sciences (Physics, Chemistry, Biology)',
  framework: '5E Model',
  instructions: `
DOMAIN: Lab Sciences (Physics, Chemistry, Biology)
FRAMEWORK: 5E (Engage → Explore → Explain → Elaborate → Evaluate)

Domain-specific rules:
- ENGAGE: Start with a real-world phenomenon or surprising observation. Use text with a hook question.
- EXPLORE: Use interactive_widget for virtual experiments — sliders for variables, live graphs showing relationships.
- EXPLAIN: Use concept_definition for precise scientific definitions. Include units and dimensional analysis.
- Use process_flow for experimental procedures and multi-step calculations.
- Use comparison_table for comparing properties, elements, species, forces, or experimental conditions.
- Include "predict then reveal" patterns: ask what will happen BEFORE showing the result (mini_quiz).
- Use analogy_card to connect abstract phenomena to everyday experience (but be precise about where analogies break down).
- For quantitative concepts: show the equation, then a worked example, then a practice problem.
- Use timeline for historical discoveries or process evolution (e.g., atomic model progression).
- Always ground explanations in observable evidence — never "just trust the formula."
- code_explainer: ONLY use when the source material involves data analysis, lab computation, or simulation code. Do NOT add Python/R code to illustrate chemistry reactions or physics laws unless the source material does.
- End with key_takeaway that distinguishes what to KNOW vs what to be able to DO.`,
}

const HUMANITIES: DomainConfig = {
  label: 'Humanities (History, Literature, Philosophy)',
  framework: 'Socratic Method',
  instructions: `
DOMAIN: Humanities (History, Literature, Philosophy)
FRAMEWORK: Socratic Method with Source Analysis

Domain-specific rules:
- Start ABSTRACT (the big question, thesis, or historical puzzle), then ground with CONCRETE evidence.
- Use quote_block for primary sources — original texts, historical documents, philosophical passages.
- Use comparison_table to contrast perspectives, interpretations, or historical accounts.
- Use timeline for chronological context — events, movements, intellectual history.
- Use analogy_card to connect historical/philosophical concepts to modern parallels.
- Use text sections as Socratic prompts — pose questions that challenge assumptions, don't just state facts.
- Use concept_definition for key terms, movements, and -isms. Include historical context in definitions.
- Avoid presenting single "right answers" — present multiple valid interpretations with evidence for each.
- mini_quiz should test analytical thinking, not factual recall. Ask "Which interpretation is best supported by..." not "When did X happen?"
- Use concept_bridge to show how ideas influenced later thinkers, movements, or current debates.
- code_explainer: Do NOT use for humanities. There is no code in history, literature, or philosophy.
- End with key_takeaway that frames the significance — why this matters today, not just what happened.`,
}

const SOCIAL_SCIENCES: DomainConfig = {
  label: 'Social Sciences',
  framework: 'Claim-Evidence-Reasoning',
  instructions: `
DOMAIN: Social Sciences (Psychology, Economics, Political Science, Sociology)
FRAMEWORK: Claim-Evidence-Reasoning

Domain-specific rules:
- Present claims with supporting DATA — use comparison_table for statistics, research findings.
- Use process_flow for research methodology: hypothesis → design → data collection → analysis → conclusion.
- Use analogy_card to connect theories to real-world observations.
- Use interactive_widget for data exploration: supply/demand curves, population models, statistical distributions.
- Distinguish correlation from causation explicitly when discussing research findings.
- Use mini_quiz to test critical thinking: "Which conclusion is supported by this data?" with misleading options.
- Use concept_definition for theoretical frameworks (e.g., rational choice theory, social constructivism).
- Use comparison_table to contrast competing theories explaining the same phenomenon.
- Include methodological critique: "What are the limitations of this study?"
- End with key_takeaway that distinguishes established findings from ongoing debates.`,
}

const ENGINEERING: DomainConfig = {
  label: 'Engineering',
  framework: 'Design-Based Learning',
  instructions: `
DOMAIN: Engineering
FRAMEWORK: Design-Based Learning (Constraints → Design → Test → Iterate)

Domain-specific rules:
- Frame problems as DESIGN CHALLENGES with constraints (cost, weight, efficiency, safety).
- Use process_flow for design procedures, manufacturing steps, and troubleshooting protocols.
- Use comparison_table for trade-off analysis between design alternatives.
- Use interactive_widget for parameter exploration: change inputs, see how outputs respond.
- Use code_explainer for simulation code, CAD scripting, or control algorithms.
- Include failure analysis: present a failed design and ask WHY it failed (mini_quiz).
- Use concept_definition for engineering standards, specifications, and technical terminology.
- Use analogy_card sparingly — engineering students prefer precise technical explanations.
- Every formula must include units, dimensional analysis, and practical application context.
- End with key_takeaway that includes both the principle AND the practical design guideline.`,
}

const BUSINESS: DomainConfig = {
  label: 'Business / Finance',
  framework: 'Case Method',
  instructions: `
DOMAIN: Business / Finance
FRAMEWORK: Harvard Case Method

Domain-specific rules:
- Present real-world SCENARIOS with incomplete information — force decision-making.
- Use comparison_table for competitive analysis, financial comparisons, strategy evaluation.
- Use process_flow for business processes, decision frameworks, and financial analysis steps.
- Use interactive_widget for financial models: ROI calculators, break-even analysis, DCF models.
- Use analogy_card to connect business concepts to everyday decision-making.
- mini_quiz should present business dilemmas with no clearly "right" answer — test reasoning quality.
- Use concept_definition for business terminology, frameworks (SWOT, Porter's 5 Forces, etc.).
- Include stakeholder perspectives — who benefits, who loses, what are the trade-offs?
- Avoid pure theory without application. Every concept needs a case example.
- End with key_takeaway that includes actionable decision criteria, not just definitions.`,
}

const LANGUAGES: DomainConfig = {
  label: 'Languages / Linguistics',
  framework: 'Comprehensible Input',
  instructions: `
DOMAIN: Languages / Linguistics
FRAMEWORK: Comprehensible Input (i+1) with Spaced Retrieval

Domain-specific rules:
- Present vocabulary IN CONTEXT — never isolated word lists. Use text sections with target words in natural sentences.
- Use concept_definition for grammar patterns — show the pattern, then 3-4 examples, then practice.
- Use comparison_table for contrasting similar constructs (ser vs estar, present vs imperfect).
- Use mini_quiz as cloze exercises: fill-in-the-blank in context, not translation.
- Use process_flow for complex grammar rules with decision trees (when to use which form).
- Use analogy_card to connect L2 patterns to L1 equivalents where helpful.
- Avoid metalinguistic jargon — teach the pattern, not the grammar term.
- Include both receptive (reading/listening) and productive (writing/speaking) practice.
- Use quote_block for authentic texts, dialogues, or cultural references.
- End with key_takeaway that includes both the PATTERN and common EXCEPTIONS.`,
}

const GENERAL: DomainConfig = {
  label: 'General',
  framework: 'General',
  instructions: `
Use a balanced mix of component types. Adapt to the content:
- Use concept_definition for new terms
- Use process_flow for procedures
- Use comparison_table for contrasts
- Use analogy_card for abstract concepts
- Use mini_quiz for knowledge checks
- Use key_takeaway at the end (required)
- Use interactive_widget when visual exploration would help
- Use concept_bridge to connect to related topics`,
}

const DOMAIN_MAP: Record<string, DomainConfig> = {
  'computer-science': CS_PROGRAMMING,
  mathematics: MATH,
  physics: LAB_SCIENCES,
  chemistry: LAB_SCIENCES,
  biology: LAB_SCIENCES,
  engineering: ENGINEERING,
  humanities: HUMANITIES,
  'social-sciences': SOCIAL_SCIENCES,
  business: BUSINESS,
  languages: LANGUAGES,
  general: GENERAL,
}

/** Get domain-specific lesson instructions based on detected domain. */
export function getDomainConfig(domain?: string): DomainConfig {
  if (!domain) return GENERAL
  return DOMAIN_MAP[domain.toLowerCase()] ?? GENERAL
}
