import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { formatPrice } from '../lib/format'
import { useCart } from '../context/CartContext'
import QuantityStepper from '../components/QuantityStepper'
import EmptyState from '../components/EmptyState'

export default function CartPage() {
  const { cart, loading, updateItem, removeItem, checkout } = useCart()
  const navigate = useNavigate()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const items = cart?.items ?? []

  async function handleQuantity(itemId: string, quantity: number) {
    setBusyId(itemId)
    setError(null)
    try {
      await updateItem(itemId, quantity)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update quantity')
    } finally {
      setBusyId(null)
    }
  }

  async function handleRemove(itemId: string) {
    setBusyId(itemId)
    setError(null)
    try {
      await removeItem(itemId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove item')
    } finally {
      setBusyId(null)
    }
  }

  async function handleCheckout() {
    setPlacing(true)
    setError(null)
    try {
      const order = await checkout()
      navigate(`/orders/${order.id}`, { state: { justOrdered: true } })
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Checkout failed. Please try again.',
      )
      setPlacing(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="center">
          <span className="spinner" aria-label="Loading cart" />
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1>Your cart</h1>
        </div>

        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}

        {items.length === 0 ? (
          <EmptyState
            title="Your cart is empty"
            message="Browse the catalog and add something you like."
            action={
              <Link to="/products" className="btn btn-primary">
                Browse products
              </Link>
            }
          />
        ) : (
          <div className="cart-layout">
            <div className="card">
              {items.map((item) => (
                <div className="cart-item" key={item.id}>
                  <Link to={`/products/${item.product.id}`} aria-hidden="true" tabIndex={-1}>
                    {item.product.imageUrl ? (
                      <img src={item.product.imageUrl} alt="" />
                    ) : (
                      <div style={{ width: 84, height: 60, background: 'var(--bg)' }} />
                    )}
                  </Link>
                  <div>
                    <Link
                      to={`/products/${item.product.id}`}
                      style={{ fontWeight: 600, color: 'var(--text)' }}
                    >
                      {item.product.name}
                    </Link>
                    <div className="small muted">{formatPrice(item.product.priceCents)} each</div>
                    <div className="row" style={{ marginTop: '0.5rem' }}>
                      <QuantityStepper
                        value={item.quantity}
                        max={Math.min(item.product.stock, 99)}
                        onChange={(q) => handleQuantity(item.id, q)}
                        disabled={busyId === item.id}
                      />
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => handleRemove(item.id)}
                        disabled={busyId === item.id}
                        aria-label={`Remove ${item.product.name} from cart`}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="price">{formatPrice(item.subtotalCents)}</div>
                </div>
              ))}
            </div>

            <aside className="card summary-card" aria-label="Order summary">
              <h2 style={{ fontSize: '1.1rem' }}>Order summary</h2>
              <div className="summary-row">
                <span className="muted">
                  Subtotal ({cart?.itemCount ?? 0} item
                  {(cart?.itemCount ?? 0) === 1 ? '' : 's'})
                </span>
                <span>{formatPrice(cart?.totalCents ?? 0)}</span>
              </div>
              <div className="summary-row">
                <span className="muted">Shipping</span>
                <span>Free</span>
              </div>
              <div className="summary-row total">
                <span>Total</span>
                <span className="price">{formatPrice(cart?.totalCents ?? 0)}</span>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-block btn-lg"
                onClick={handleCheckout}
                disabled={placing}
                style={{ marginTop: '0.75rem' }}
              >
                {placing ? 'Placing order…' : 'Place order'}
              </button>
              <p className="small muted" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
                This demo places a real order in the local database and decrements stock.
              </p>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}
