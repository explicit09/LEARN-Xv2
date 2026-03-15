interface ComparisonTableProps {
  title: string
  columns: string[]
  rows: { label: string; values: string[] }[]
}

export function ComparisonTable({ title, columns, rows }: ComparisonTableProps) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
        {title}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 pr-4 font-medium text-foreground/70"></th>
              {columns.map((col, i) => (
                <th key={i} className="text-left py-2 pr-4 font-medium text-foreground/70">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-border/50 last:border-0">
                <td className="py-2 pr-4 font-medium">{row.label}</td>
                {row.values.map((val, j) => (
                  <td key={j} className="py-2 pr-4 text-muted-foreground">
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
