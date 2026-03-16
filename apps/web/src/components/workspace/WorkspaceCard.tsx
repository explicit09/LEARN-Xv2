import Link from 'next/link'
import { Badge } from '@learn-x/ui'

interface WorkspaceCardProps {
  id: string
  name: string
  description?: string | null
  status: string
  totalTokenCount: number
  updatedAt?: string | null
  createdAt?: string | null
}

export function WorkspaceCard({
  id,
  name,
  description,
  status,
  totalTokenCount,
  updatedAt,
  createdAt,
}: WorkspaceCardProps) {
  
  // Deterministic mock data for the design demonstration based on ID
  const isMockAlert = id.charCodeAt(0) % 2 === 0
  const mastery = 40 + (id.charCodeAt(0) % 60)
  const docs = (id.charCodeAt(0) % 10) + 1
  
  return (
    <Link
      href={`/workspace/${id}`}
      className="group block rounded-2xl glass-card p-5 transition-all hover:border-primary/50 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-primary/10 transition-colors" />
      
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div>
          <div className="flex items-start justify-between gap-4 mb-2">
            <h3 className="font-bold text-lg leading-tight line-clamp-2">{name}</h3>
            {isMockAlert ? (
               <div className="shrink-0 bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-bold px-2 py-0.5 rounded-full">
                  8 due
               </div>
            ) : (
               <div className="shrink-0 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-bold px-2 py-0.5 rounded-full">
                  Active
               </div>
            )}
          </div>
          <div className="h-1 w-full bg-muted rounded-full mt-3 overflow-hidden">
            <div 
              className={`h-full rounded-full ${isMockAlert ? 'bg-primary' : 'bg-primary'}`} 
              style={{ width: `${mastery}%` }} 
            />
          </div>
        </div>
        
        <div className="mt-4 flex items-center justify-between">
           <p className="text-sm font-medium text-muted-foreground">
             {mastery}% mastery · {docs} docs
           </p>
           {isMockAlert && (
             <p className="text-xs font-bold text-yellow-500">
               Exam Mar 22
             </p>
           )}
        </div>
      </div>
    </Link>
  )
}
