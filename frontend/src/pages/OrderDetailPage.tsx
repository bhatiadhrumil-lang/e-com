import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import type { Order } from '../types'
import { formatDateTime, formatPrice } from '../lib/format'
import StatusBadge from '../components/StatusBadge'

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const justOrdered = (location.state as { justOrdered?: boolean } | null)?.justOrdered === true

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    api<{ order: Order }>(`/orders/${id}`)
      .then((data) => setOrder(data.order))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load order'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="page">
        <div className="center">
          <span className="spinner" aria-label="Loading order" />
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="page">
        <div className="container">
          <div className="alert alert-error" role="alert">
            {error ?? 'Order not found'}
          </div>
          <Link to="/orders" className="btn btn-secondary">
            Back to orders
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 800 }}>
        <p style={{ marginBottom: '1rem' }}>
          <Link to="/orders" className="small">
            ← Back to orders
          </Link>
        </p>

        {justOrdered && (
          <div className="alert alert-success" role="status">
            Order placed successfully. Thanks for shopping!
          </div>
        )}

        <div className="card" style={{ padding: '1.5rem' }}>
          <div className="row-between wrap">
            <div>
              <h1 style={{ fontSize: '1.4rem' }}>Order #{order.id.slice(-8).toUpperCase()}</h1>
              <p className="small muted" style={{ margin: 0 }}>
                Placed {formatDateTime(order.createdAt)}
              </p>
            </div>
            <StatusBadge status={order.status} />
          </div>

          <hr className="divider" />

          <ul className="order-items">
            {order.items.map((item) => (
              <li key={item.id}>
                {item.productImageUrl ? (
                  <img src={item.productImageUrl} alt="" />
                ) : (
                  <div style={{ width: 56, height: 42, background: 'var(--bg)' }} />
                )}
                <div>
                  <div style={{ fontWeight: 600 }}>{item.productName}</div>
                  <div className="small muted">
                    {formatPrice(item.unitPriceCents)} × {item.quantity}
                  </div>
                </div>
                <div className="price">{formatPrice(item.lineTotalCents)}</div>
              </li>
            ))}
          </ul>

          <hr className="divider" />

          <div className="summary-row">
            <span className="muted">
              {order.itemCount} item{order.itemCount === 1 ? '' : 's'}
            </span>
            <span />
          </div>
          <div className="summary-row total">
            <span>Total</span>
            <span className="price">{formatPrice(order.totalCents)}</span>
          </div>

          <p className="small muted" style={{ marginTop: '1rem', marginBottom: 0 }}>
            Order ID: <code>{order.id}</code>. Product names and prices are snapshotted at
            purchase time, so this record stays accurate even if the catalog changes.
          </p>
        </div>

        <div className="row" style={{ marginTop: '1.25rem' }}>
          <Link to="/products" className="btn btn-secondary">
            Continue shopping
          </Link>
          <Link to="/orders" className="btn btn-ghost">
            All orders
          </Link>
        </div>
      </div>
    </div>
  )
}
