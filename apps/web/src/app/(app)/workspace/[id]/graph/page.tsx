'use client'

import { use, useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc/client'
import { Topbar } from '@/components/layout/Topbar'

interface GraphPageProps {
  params: Promise<{ id: string }>
}

type Node = {
  id: string
  name: string
  masteryLevel: number | null
  tag: string | null
  domain: string | null
  // Physics simulation state
  x: number
  y: number
  vx: number
  vy: number
}

type Edge = {
  source: string
  target: string
  relationType: string
}

const MASTERY_COLOR = (level: number | null) => {
  if (level === null) return 'hsl(215,20%,50%)'
  if (level >= 0.8) return 'hsl(142,71%,45%)'
  if (level >= 0.5) return 'hsl(45,93%,47%)'
  return 'hsl(0,84%,60%)'
}

const RELATION_DASH: Record<string, string> = {
  prerequisite: '0',
  related: '4 4',
  extends: '8 4',
  part_of: '2 6',
}

function useForceSimulation(nodes: Node[], edges: Edge[], width: number, height: number) {
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})
  const frameRef = useRef<number | undefined>(undefined)
  const simNodes = useRef<Node[]>([])

  useEffect(() => {
    if (!nodes.length || !width || !height) return

    // Initialize positions in a circle
    simNodes.current = nodes.map((n, i) => ({
      ...n,
      x: width / 2 + Math.cos((i / nodes.length) * 2 * Math.PI) * 120,
      y: height / 2 + Math.sin((i / nodes.length) * 2 * Math.PI) * 120,
      vx: 0,
      vy: 0,
    }))

    const idxMap: Record<string, number> = {}
    simNodes.current.forEach((n, i) => {
      idxMap[n.id] = i
    })

    let iter = 0
    const MAX_ITER = 200

    function tick() {
      if (iter >= MAX_ITER) return
      iter++
      const ns = simNodes.current

      // Repulsion
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const ni = ns[i]!
          const nj = ns[j]!
          const dx = nj.x - ni.x
          const dy = nj.y - ni.y
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
          const force = 3000 / (dist * dist)
          const fx = (dx / dist) * force
          const fy = (dy / dist) * force
          ni.vx -= fx
          ni.vy -= fy
          nj.vx += fx
          nj.vy += fy
        }
      }

      // Attraction (springs for edges)
      for (const edge of edges) {
        const si = idxMap[edge.source]
        const ti = idxMap[edge.target]
        if (si === undefined || ti === undefined) continue
        const src = ns[si]!
        const tgt = ns[ti]!
        const dx = tgt.x - src.x
        const dy = tgt.y - src.y
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
        const TARGET_DIST = 160
        const force = (dist - TARGET_DIST) * 0.03
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        src.vx += fx
        src.vy += fy
        tgt.vx -= fx
        tgt.vy -= fy
      }

      // Center gravity
      for (const n of ns) {
        n.vx += (width / 2 - n.x) * 0.002
        n.vy += (height / 2 - n.y) * 0.002
        // Apply velocity with damping
        n.vx *= 0.85
        n.vy *= 0.85
        n.x = Math.max(40, Math.min(width - 40, n.x + n.vx))
        n.y = Math.max(40, Math.min(height - 40, n.y + n.vy))
      }

      const snap: Record<string, { x: number; y: number }> = {}
      for (const n of ns) snap[n.id] = { x: n.x, y: n.y }
      setPositions(snap)

      frameRef.current = requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => {
      if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current)
    }
  }, [nodes, edges, width, height])

  return positions
}

function KnowledgeGraphCanvas({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 600, height: 480 })

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver((entries) => {
      const e = entries[0]
      if (e) {
        setSize({ width: e.contentRect.width, height: e.contentRect.height })
      }
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const positions = useForceSimulation(nodes, edges, size.width, size.height)
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <div ref={containerRef} className="w-full h-full" aria-label="Concept knowledge graph">
      <svg width={size.width} height={size.height} aria-hidden="true">
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="hsl(215,20%,50%)" />
          </marker>
        </defs>

        {/* Edges */}
        {edges.map((edge, i) => {
          const sp = positions[edge.source]
          const tp = positions[edge.target]
          if (!sp || !tp) return null
          return (
            <line
              key={i}
              x1={sp.x}
              y1={sp.y}
              x2={tp.x}
              y2={tp.y}
              stroke="hsl(215,20%,50%)"
              strokeWidth={1.5}
              strokeDasharray={RELATION_DASH[edge.relationType] ?? '0'}
              strokeOpacity={0.6}
              markerEnd="url(#arrow)"
            />
          )
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const pos = positions[node.id]
          if (!pos) return null
          const color = MASTERY_COLOR(node.masteryLevel)
          const r = 20
          const isHovered = hovered === node.id
          return (
            <g
              key={node.id}
              transform={`translate(${pos.x},${pos.y})`}
              onMouseEnter={() => setHovered(node.id)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'pointer' }}
              role="img"
              aria-label={`${node.name}${node.masteryLevel !== null ? `, mastery ${Math.round(node.masteryLevel * 100)}%` : ''}`}
            >
              <circle
                r={isHovered ? r + 4 : r}
                fill={color}
                fillOpacity={0.85}
                stroke="hsl(215,30%,25%)"
                strokeWidth={isHovered ? 2 : 1}
                style={{ transition: 'r 0.15s, stroke-width 0.15s' }}
              />
              {node.masteryLevel !== null && (
                <text
                  y={1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize={9}
                  fontWeight="600"
                >
                  {Math.round(node.masteryLevel * 100)}%
                </text>
              )}
              <text
                y={r + 12}
                textAnchor="middle"
                fill="currentColor"
                fontSize={11}
                className="fill-foreground"
              >
                {node.name.length > 16 ? node.name.slice(0, 15) + '…' : node.name}
              </text>
              {node.domain && (
                <text y={r + 24} textAnchor="middle" fill="hsl(215,20%,55%)" fontSize={9}>
                  {node.domain}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function GraphLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-card px-4 py-3 text-xs">
      <span className="font-medium text-muted-foreground">Node color:</span>
      {[
        { color: 'hsl(142,71%,45%)', label: '≥80% mastery' },
        { color: 'hsl(45,93%,47%)', label: '50–80%' },
        { color: 'hsl(0,84%,60%)', label: '<50%' },
        { color: 'hsl(215,20%,50%)', label: 'No data' },
      ].map(({ color, label }) => (
        <div key={label} className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-muted-foreground">{label}</span>
        </div>
      ))}
      <span className="ml-2 font-medium text-muted-foreground">Edge type:</span>
      {[
        { dash: '0', label: 'Prerequisite' },
        { dash: '4 4', label: 'Related' },
        { dash: '8 4', label: 'Extends' },
        { dash: '2 6', label: 'Part of' },
      ].map(({ dash, label }) => (
        <div key={label} className="flex items-center gap-1.5">
          <svg width={24} height={8} aria-hidden="true">
            <line
              x1={0}
              y1={4}
              x2={24}
              y2={4}
              stroke="hsl(215,20%,50%)"
              strokeWidth={1.5}
              strokeDasharray={dash}
            />
          </svg>
          <span className="text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  )
}

function GraphView({ workspaceId }: { workspaceId: string }) {
  const { data: graph, isLoading } = trpc.knowledgeGraph.getGraph.useQuery({ workspaceId })

  const nodes: Node[] = (graph?.nodes ?? []).map((n) => ({
    id: n.id,
    name: n.name,
    masteryLevel: n.masteryLevel ?? null,
    tag: n.tag ?? null,
    domain: n.domain ?? null,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
  }))

  const edges: Edge[] = (graph?.edges ?? []).map((e) => ({
    source: e.source,
    target: e.target,
    relationType: e.relationType,
  }))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!nodes.length) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <svg
          className="h-10 w-10 text-muted-foreground"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <circle cx="12" cy="5" r="2" />
          <circle cx="5" cy="19" r="2" />
          <circle cx="19" cy="19" r="2" />
          <line x1="12" y1="7" x2="5" y2="17" />
          <line x1="12" y1="7" x2="19" y2="17" />
        </svg>
        <p className="text-sm font-medium">No concepts yet</p>
        <p className="text-xs text-muted-foreground">
          Upload a document and generate lessons to populate the knowledge graph.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <GraphLegend />
      <div className="rounded-lg border bg-card" style={{ height: '520px' }}>
        <KnowledgeGraphCanvas nodes={nodes} edges={edges} />
      </div>
      <p className="text-xs text-muted-foreground text-center">
        {nodes.length} concept{nodes.length !== 1 ? 's' : ''} · {edges.length} relation
        {edges.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}

export default function GraphPage({ params }: GraphPageProps) {
  const { id: workspaceId } = use(params)
  return (
    <>
      <Topbar title="Knowledge Graph" />
      <div className="flex-1 p-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Knowledge Graph</h1>
              <p className="text-sm text-muted-foreground">
                Visual map of concepts and their relationships, coloured by mastery level
              </p>
            </div>
            <Link
              href={`/workspace/${workspaceId}`}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to workspace
            </Link>
          </div>
          <GraphView workspaceId={workspaceId} />
        </div>
      </div>
    </>
  )
}
