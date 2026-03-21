import type { LessonSection } from '@learn-x/validators'
import { AnalogyCard } from './sections/AnalogyCard'
import { CodeExplainer } from './sections/CodeExplainer'
import { ComparisonTable } from './sections/ComparisonTable'
import { ConceptBridge } from './sections/ConceptBridge'
import { ConceptDefinition } from './sections/ConceptDefinition'
import { KeyTakeaway } from './sections/KeyTakeaway'
import { MiniQuiz } from './sections/MiniQuiz'
import { ProcessFlow } from './sections/ProcessFlow'
import { QuoteBlock } from './sections/QuoteBlock'
import { TextSection } from './sections/TextSection'
import { Timeline } from './sections/Timeline'
import { InteractiveWidget } from './sections/InteractiveWidget'
import { CollapsibleSection } from './sections/CollapsibleSection'
import type { SourceInfo } from './sections/CitationBadge'

interface LessonRendererProps {
  sections: LessonSection[]
  collapsible?: boolean
  sourceMapping?: SourceInfo[] | undefined
  onCitationClick?: ((n: number) => void) | undefined
}

export function LessonRenderer({
  sections,
  collapsible = false,
  sourceMapping,
  onCitationClick,
}: LessonRendererProps) {
  return (
    <div className="space-y-8">
      {sections.map((section, i) => (
        <LessonSectionBlock
          key={i}
          section={section}
          collapsible={collapsible}
          sourceMapping={sourceMapping}
          onCitationClick={onCitationClick}
        />
      ))}
    </div>
  )
}

function LessonSectionBlock({
  section,
  collapsible,
  sourceMapping,
  onCitationClick,
}: {
  section: LessonSection
  collapsible: boolean
  sourceMapping?: SourceInfo[] | undefined
  onCitationClick?: ((n: number) => void) | undefined
}) {
  switch (section.type) {
    case 'text':
      return (
        <TextSection
          content={section.content}
          sourceMapping={sourceMapping}
          onCitationClick={onCitationClick}
        />
      )
    case 'concept_definition':
      return (
        <ConceptDefinition
          term={section.term}
          definition={section.definition}
          {...(section.analogy ? { analogy: section.analogy } : {})}
          {...(section.etymology ? { etymology: section.etymology } : {})}
        />
      )
    case 'process_flow':
      return <ProcessFlow title={section.title} steps={section.steps} />
    case 'comparison_table':
      if (collapsible) {
        return (
          <CollapsibleSection
            icon="📊"
            summary={section.title}
            label={`${section.columns.length} columns · ${section.rows.length} rows`}
          >
            <ComparisonTable title={section.title} columns={section.columns} rows={section.rows} />
          </CollapsibleSection>
        )
      }
      return <ComparisonTable title={section.title} columns={section.columns} rows={section.rows} />
    case 'analogy_card':
      if (collapsible) {
        return (
          <CollapsibleSection
            icon="💡"
            summary={`${section.concept} is like ${section.analogy}`}
            label="Mental model"
          >
            <AnalogyCard
              concept={section.concept}
              analogy={section.analogy}
              mapping={section.mapping}
            />
          </CollapsibleSection>
        )
      }
      return (
        <AnalogyCard
          concept={section.concept}
          analogy={section.analogy}
          mapping={section.mapping}
        />
      )
    case 'key_takeaway':
      return <KeyTakeaway points={section.points} />
    case 'mini_quiz':
      return (
        <MiniQuiz
          question={section.question}
          options={section.options}
          explanation={section.explanation}
        />
      )
    case 'quote_block':
      return <QuoteBlock quote={section.quote} attribution={section.attribution} />
    case 'timeline':
      if (collapsible) {
        return (
          <CollapsibleSection
            icon="📅"
            summary={section.title}
            label={`${section.events.length} events`}
          >
            <Timeline title={section.title} events={section.events} />
          </CollapsibleSection>
        )
      }
      return <Timeline title={section.title} events={section.events} />
    case 'concept_bridge':
      return (
        <ConceptBridge
          from={
            (section as Record<string, string>).from_concept ||
            (section as Record<string, string>).from ||
            ''
          }
          to={
            (section as Record<string, string>).to_concept ||
            (section as Record<string, string>).to ||
            ''
          }
          relation={section.relation}
          explanation={section.explanation}
        />
      )
    case 'code_explainer':
      if (collapsible) {
        return (
          <CollapsibleSection
            icon="💻"
            summary={`${section.language} code example`}
            label={`${section.annotations.length} annotations`}
          >
            <CodeExplainer
              language={section.language}
              code={section.code}
              annotations={section.annotations}
            />
          </CollapsibleSection>
        )
      }
      return (
        <CodeExplainer
          language={section.language}
          code={section.code}
          annotations={section.annotations}
        />
      )
    case 'interactive_widget':
      if (collapsible) {
        return (
          <CollapsibleSection icon="🧪" summary={section.title} label="Interactive exploration">
            <InteractiveWidget
              title={section.title}
              description={section.description}
              html={section.html}
            />
          </CollapsibleSection>
        )
      }
      return (
        <InteractiveWidget
          title={section.title}
          description={section.description}
          html={section.html}
        />
      )
    default:
      return null
  }
}
