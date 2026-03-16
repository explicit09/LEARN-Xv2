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

interface LessonRendererProps {
  sections: LessonSection[]
}

export function LessonRenderer({ sections }: LessonRendererProps) {
  return (
    <div className="space-y-8">
      {sections.map((section, i) => (
        <LessonSectionBlock key={i} section={section} />
      ))}
    </div>
  )
}

function LessonSectionBlock({ section }: { section: LessonSection }) {
  switch (section.type) {
    case 'text':
      return <TextSection content={section.content} />
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
      return <ComparisonTable title={section.title} columns={section.columns} rows={section.rows} />
    case 'analogy_card':
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
      return <Timeline title={section.title} events={section.events} />
    case 'concept_bridge':
      return (
        <ConceptBridge
          from={section.from}
          to={section.to}
          relation={section.relation}
          explanation={section.explanation}
        />
      )
    case 'code_explainer':
      return (
        <CodeExplainer
          language={section.language}
          code={section.code}
          annotations={section.annotations}
        />
      )
    default:
      return null
  }
}
