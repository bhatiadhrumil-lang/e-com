import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import type { Order, Paginated } from '../types'
import { formatDateTime, formatPrice } from '../lib/format'
import StatusBadge from '../components/StatusBadge'
import Pagination from '../components/Pagination'
import EmptyState from '../components/EmptyState'

export default function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Number.parseInt(searchParams.get('page') ?? '1', 10) || 1

  const [data, setData] = useState<Paginated<Order> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api<Paginated<Order>>(`/orders?page=${page}&pageSize=10`)
      setData(result)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load orders')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    void load()
  }, [load])

  function goToPage(p: number) {
    const next = new URLSearchParams(searchParams)
    next.set('page', String(p))
    setSearchParams(next)
  }

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1>Your orders</h1>
          <p className="muted" style={{ margin: 0 }}>
            {data ? `${data.total} order${data.total === 1 ? '' : 's'}` : 'Order history'}
          </p>
        </div>

        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="center">
            <span className="spinner" aria-label="Loading orders" />
          </div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            title="No orders yet"
            message="When you place an order, it will show up here."
            action={
              <Link to="/products" className="btn btn-primary">
                Start shopping
              </Link>
            }
          />
        ) : (
          <>
            <div className="card">
              {data.items.map((order) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="order-row"
                  style={{ color: 'inherit', textDecoration: 'none' }}
                >
                  <div className="grow">
                    <div className="row">
                      <strong>Order #{order.id.slice(-8).toUpperCase()}</strong>
                      <StatusBadge status={order.status} />
                    </div>
                    <div className="small muted">
                      {formatDateTime(order.createdAt)} · {order.itemCount} item
                      {order.itemCount === 1 ? '' : 's'}
                    </div>
                  </div>
                  <div className="price">{formatPrice(order.totalCents)}</div>
                </Link>
              ))}
            </div>
            <Pagination page={data.page} totalPages={data.totalPages} onChange={goToPage} />
          </>
        )}
      </div>
    </div>
  )
}
