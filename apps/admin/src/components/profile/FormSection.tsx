import type { ReactNode } from 'react'
import { cn } from '../../lib/format'
import { Card } from '../ui'

/** A titled card grouping related form fields. */
export function FormSection({ id, title, description, children, className }: { id?: string; title: ReactNode; description?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card id={id} className={cn('scroll-mt-24', className)}>
      <div className="mb-4">
        <h2 className="text-[15px] font-semibold text-fg">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </Card>
  )
}

/** Responsive two-column row for short fields. */
export function FieldRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid gap-4 sm:grid-cols-2', className)}>{children}</div>
}
