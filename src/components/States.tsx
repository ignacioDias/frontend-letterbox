import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="loading-state" role="status">
      <span className="loading-state__reel" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="notice notice--error" role="alert">
      <p>{message}</p>
      {onRetry ? (
        <button type="button" className="button button--ghost" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  )
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string
  children?: ReactNode
  action?: { label: string; to: string }
}) {
  return (
    <div className="empty-state">
      <span className="empty-state__mark" aria-hidden="true">
        <span />
      </span>
      <h3>{title}</h3>
      {children ? <p>{children}</p> : null}
      {action ? (
        <Link className="button button--ghost" to={action.to}>
          {action.label}
        </Link>
      ) : null}
    </div>
  )
}
