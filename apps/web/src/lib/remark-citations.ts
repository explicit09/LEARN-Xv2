/**
 * Remark plugin that converts [n] citation markers in text nodes
 * into custom citation-marker HAST elements rendered by CitationBadge.
 * Ported from LEARN-X V1's SafeMarkdown remarkCitations plugin.
 */
import { visit } from 'unist-util-visit'
import type { Root, Text, Parent } from 'mdast'

interface CitationNode {
  type: string
  value: string
  data: { hName: string; hProperties: Record<string, string> }
}

interface ReplacementEntry {
  parent: Parent
  index: number
  nodes: (Text | CitationNode)[]
}

export function remarkCitations() {
  return (tree: Root) => {
    const CITATION_RE = /\[(\d+)\]/g
    const replacements: ReplacementEntry[] = []

    visit(tree, 'text', (node: Text, index: number | undefined, parent: Parent | undefined) => {
      if (!parent || index == null) return

      const text = node.value
      if (!CITATION_RE.test(text)) return
      CITATION_RE.lastIndex = 0

      const nodes: (Text | CitationNode)[] = []
      let lastIndex = 0
      let match: RegExpExecArray | null

      while ((match = CITATION_RE.exec(text)) !== null) {
        if (match.index > lastIndex) {
          nodes.push({ type: 'text', value: text.slice(lastIndex, match.index) })
        }
        nodes.push({
          type: 'citation' as string,
          value: match[1]!,
          data: { hName: 'citation-marker', hProperties: { n: match[1]! } },
        })
        lastIndex = CITATION_RE.lastIndex
      }

      if (lastIndex < text.length) {
        nodes.push({ type: 'text', value: text.slice(lastIndex) })
      }

      replacements.push({ parent, index, nodes })
    })

    for (let i = replacements.length - 1; i >= 0; i--) {
      const { parent, index, nodes } = replacements[i]!
      ;(parent.children as (Text | CitationNode)[]).splice(index, 1, ...nodes)
    }
  }
}
