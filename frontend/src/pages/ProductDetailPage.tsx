import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import type { Product } from '../types'
import { formatPrice } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import QuantityStepper from '../components/QuantityStepper'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addItem } = useCart()

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    api<{ product: Product }>(`/products/${id}`)
      .then((data) => setProduct(data.product))
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Failed to load product'),
      )
      .finally(() => setLoading(false))
  }, [id])

  async function handleAdd() {
    if (!product) return
    if (!user) {
      navigate('/login', { state: { from: `/products/${product.id}` } })
      return
    }
    setAdding(true)
    setActionError(null)
    setAdded(false)
    try {
      await addItem(product.id, quantity)
      setAdded(true)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not add to cart')
    } finally {
      setAdding(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="center">
          <span className="spinner" aria-label="Loading product" />
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="page">
        <div className="container">
          <div className="alert alert-error" role="alert">
            {error ?? 'Product not found'}
          </div>
          <Link to="/products" className="btn btn-secondary">
            Back to products
          </Link>
        </div>
      </div>
    )
  }

  const outOfStock = product.stock <= 0
  const maxQty = Math.min(product.stock, 99)

  return (
    <div className="page">
      <div className="container">
        <p style={{ marginBottom: '1rem' }}>
          <Link to="/products" className="small">
            ← Back to products
          </Link>
        </p>

        <div className="product-detail">
          <div className="media">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} />
            ) : (
              <div style={{ aspectRatio: '3/2', background: 'var(--bg)' }} />
            )}
          </div>

          <div>
            {product.category && (
              <span className="badge badge-muted">{product.category}</span>
            )}
            <h1 style={{ marginTop: '0.6rem' }}>{product.name}</h1>
            <p className="price" style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>
              {formatPrice(product.priceCents)}
            </p>
            <p className={`stock-note${outOfStock ? ' out' : product.stock <= 5 ? ' low' : ''}`}>
              {outOfStock
                ? 'Out of stock'
                : product.stock <= 5
                  ? `Only ${product.stock} left in stock`
                  : `${product.stock} in stock`}
            </p>

            <p style={{ marginTop: '1rem', color: 'var(--muted)' }}>{product.description}</p>

            <div className="row wrap" style={{ marginTop: '1.5rem' }}>
              <QuantityStepper
                value={quantity}
                max={maxQty}
                onChange={setQuantity}
                disabled={outOfStock || adding}
              />
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={handleAdd}
                disabled={outOfStock || adding}
              >
                {adding ? 'Adding…' : outOfStock ? 'Out of stock' : 'Add to cart'}
              </button>
              <Link to="/cart" className="btn btn-secondary btn-lg">
                Go to cart
              </Link>
            </div>

            {added && (
              <div className="alert alert-success" role="status" style={{ marginTop: '1rem' }}>
                Added {quantity} × {product.name} to your cart.{' '}
                <Link to="/cart">View cart</Link>
              </div>
            )}
            {actionError && (
              <div className="alert alert-error" role="alert" style={{ marginTop: '1rem' }}>
                {actionError}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
