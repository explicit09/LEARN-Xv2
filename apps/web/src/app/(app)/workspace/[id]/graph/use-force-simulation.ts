'use client'

import { useEffect, useRef, useState } from 'react'

export type GraphNode = {
  id: string
  name: string
  masteryLevel: number | null
  tag: string | null
  domain: string | null
  x: number
  y: number
  vx: number
  vy: number
}

export type GraphEdge = {
  source: string
  target: string
  relationType: string
}

export function useForceSimulation(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
) {
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})
  const frameRef = useRef<number | undefined>(undefined)
  const simNodes = useRef<GraphNode[]>([])

  useEffect(() => {
    if (!nodes.length || !width || !height) return

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
