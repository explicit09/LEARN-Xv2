import { pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { concepts } from './schema'

export const conceptTags = pgTable(
  'concept_tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conceptId: uuid('concept_id')
      .notNull()
      .references(() => concepts.id, { onDelete: 'cascade' }),
    tag: text('tag').notNull(),
    domain: text('domain'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.conceptId, table.tag)],
)

export const conceptRelationsGlobal = pgTable(
  'concept_relations_global',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceConceptId: uuid('source_concept_id')
      .notNull()
      .references(() => concepts.id, { onDelete: 'cascade' }),
    targetConceptId: uuid('target_concept_id')
      .notNull()
      .references(() => concepts.id, { onDelete: 'cascade' }),
    relationType: text('relation_type', {
      enum: ['prerequisite', 'related', 'extends', 'part_of'],
    }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.sourceConceptId, table.targetConceptId, table.relationType)],
)
