interface TopbarProps {
  title: string
  actions?: React.ReactNode
}

export function Topbar({ title, actions }: TopbarProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-6">
      <h1 className="text-sm font-semibold">{title}</h1>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  )
}
