import type { ReactNode } from 'react'

interface Props {
  title: string
  message?: string
  action?: ReactNode
}

export default function EmptyState({ title, message, action }: Props) {
  return (
    <div className="empty-state card">
      <h2>{title}</h2>
      {message && <p>{message}</p>}
      {action}
    </div>
  )
}
