'use client'

import { useRef, useEffect, useState } from 'react'
import { Play, Maximize2, Minimize2 } from 'lucide-react'

interface InteractiveWidgetProps {
  title: string
  description: string
  html: string
}

export function InteractiveWidget({ title, description, html }: InteractiveWidgetProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(400)
  const [expanded, setExpanded] = useState(false)

  // Wrap the LLM-generated HTML in a minimal document with reset styles
  const srcdoc = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1a1a2e; background: #ffffff; padding: 24px;
    line-height: 1.6; font-size: 15px;
  }
  input[type="range"] {
    -webkit-appearance: none; width: 100%; height: 6px;
    border-radius: 3px; background: #e2e8f0; outline: none;
    cursor: pointer;
  }
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none; width: 20px; height: 20px;
    border-radius: 50%; background: #3b82f6; cursor: pointer;
  }
  button {
    font-family: inherit; cursor: pointer;
    border: 1px solid #e2e8f0; border-radius: 8px;
    padding: 8px 16px; font-size: 14px; font-weight: 500;
    background: #f8fafc; transition: all 0.15s;
  }
  button:hover { background: #e2e8f0; }
  button.primary {
    background: #3b82f6; color: white; border-color: #3b82f6;
  }
  button.primary:hover { background: #2563eb; }
  canvas { display: block; max-width: 100%; }
  .label { font-size: 13px; color: #64748b; font-weight: 500; }
  .value { font-size: 18px; font-weight: 700; color: #1e293b; }
</style>
</head>
<body>
${html}
<script>
  // Auto-resize: send height to parent
  function sendHeight() {
    const h = document.body.scrollHeight;
    window.parent.postMessage({ type: 'widget-resize', height: h }, '*');
  }
  new ResizeObserver(sendHeight).observe(document.body);
  sendHeight();
</script>
</body>
</html>`

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === 'widget-resize' && typeof e.data.height === 'number') {
        setHeight(Math.min(Math.max(e.data.height + 16, 200), expanded ? 1200 : 700))
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [expanded])

  return (
    <div className="rounded-3xl border-2 border-emerald-500/30 bg-emerald-500/[0.03] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-500/20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Play className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <span className="text-sm font-bold uppercase tracking-widest text-emerald-600">
              Interactive
            </span>
            <h3 className="text-base font-bold text-foreground -mt-0.5">{title}</h3>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-2 rounded-lg hover:bg-emerald-500/10 transition-colors text-muted-foreground hover:text-foreground"
        >
          {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Description */}
      {description && (
        <p className="px-6 pt-3 text-sm text-muted-foreground">{description}</p>
      )}

      {/* Sandboxed iframe */}
      <div className="p-4">
        <iframe
          ref={iframeRef}
          srcDoc={srcdoc}
          sandbox="allow-scripts"
          className="w-full border-0 rounded-xl bg-white"
          style={{ height: `${height}px` }}
          title={title}
        />
      </div>
    </div>
  )
}
