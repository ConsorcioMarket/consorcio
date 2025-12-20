import { LucideIcon } from 'lucide-react'
import { Button } from './button'
import Link from 'next/link'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="text-center py-12 bg-muted/30 rounded-lg">
      <Icon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <p className="text-muted-foreground font-medium mb-2">{title}</p>
      {description && (
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          {description}
        </p>
      )}
      {actionLabel && (actionHref || onAction) && (
        actionHref ? (
          <Link href={actionHref}>
            <Button>{actionLabel}</Button>
          </Link>
        ) : (
          <Button onClick={onAction}>{actionLabel}</Button>
        )
      )}
    </div>
  )
}
