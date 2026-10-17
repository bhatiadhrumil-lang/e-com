import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Product } from '../types'
import { formatPrice } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

interface Props {
  product: Product
}

export default function ProductCard({ product }: Props) {
  const { user } = useAuth()
  const { addItem } = useCart()
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const outOfStock = product.stock <= 0

  async function handleAdd() {
    if (!user) {
      navigate('/login', { state: { from: `/products/${product.id}` } })
      return
    }
    setAdding(true)
    setError(null)
    try {
      await addItem(product.id, 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add to cart')
    } finally {
      setAdding(false)
    }
  }

  return (
    <article className="card product-card">
      <Link to={`/products/${product.id}`} className="thumb" tabIndex={-1} aria-hidden="true">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt="" loading="lazy" />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'var(--bg)' }} />
        )}
      </Link>
      <div className="body">
        {product.category && <span className="category">{product.category}</span>}
        <Link to={`/products/${product.id}`} className="name">
          {product.name}
        </Link>
        <span className="price">{formatPrice(product.priceCents)}</span>
        <span className={`stock-note${outOfStock ? ' out' : product.stock <= 5 ? ' low' : ''}`}>
          {outOfStock ? 'Out of stock' : `${product.stock} in stock`}
        </span>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <div className="actions">
          <button
            type="button"
            className="btn btn-primary btn-sm btn-block"
            onClick={handleAdd}
            disabled={outOfStock || adding}
          >
            {adding ? 'Adding…' : outOfStock ? 'Unavailable' : 'Add to cart'}
          </button>
        </div>
      </div>
    </article>
  )
}
