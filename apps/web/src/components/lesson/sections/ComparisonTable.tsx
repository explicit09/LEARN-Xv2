import { GitCompareArrows } from 'lucide-react'

interface ComparisonTableProps {
  title: string
  columns: string[]
  rows: { label: string; values: string[] }[]
}

export function ComparisonTable({ title, columns, rows }: ComparisonTableProps) {
  return (
    <div className="rounded-3xl border border-border bg-card/60 backdrop-blur-xl p-6 lg:p-8 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
          <GitCompareArrows className="w-4 h-4 text-violet-500" />
        </div>
        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          {title}
        </h3>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-muted/60">
              <th className="text-left py-3 px-4 font-bold text-foreground text-xs uppercase tracking-wider"></th>
              {columns.map((col, i) => (
                <th key={i} className="text-left py-3 px-4 font-bold text-foreground text-xs uppercase tracking-wider">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className={`border-t border-border/50 ${i % 2 === 1 ? 'bg-muted/20' : ''} hover:bg-muted/40 transition-colors`}
              >
                <td className="py-3 px-4 font-semibold text-foreground">{row.label}</td>
                {row.values.map((val, j) => (
                  <td key={j} className="py-3 px-4 text-muted-foreground">
                    {val}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
