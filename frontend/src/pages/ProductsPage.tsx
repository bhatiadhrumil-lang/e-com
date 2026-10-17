import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import type { Paginated, Product } from '../types'
import ProductCard from '../components/ProductCard'
import Pagination from '../components/Pagination'

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Number.parseInt(searchParams.get('page') ?? '1', 10) || 1
  const category = searchParams.get('category') ?? ''
  const search = searchParams.get('search') ?? ''

  const [data, setData] = useState<Paginated<Product> | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState(search)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '12' })
      if (category) params.set('category', category)
      if (search) params.set('search', search)
      const result = await api<Paginated<Product>>(`/products?${params.toString()}`)
      setData(result)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load products')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [page, category, search])

  useEffect(() => {
    void load()
  }, [load])

  // Derive the category filter list from a broad first page.
  useEffect(() => {
    api<Paginated<Product>>('/products?pageSize=50')
      .then((data) => {
        const set = new Set<string>()
        for (const p of data.items) {
          if (p.category) set.add(p.category)
        }
        setCategories([...set].sort())
      })
      .catch(() => setCategories([]))
  }, [])

  function updateParams(patch: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '') next.delete(key)
      else next.set(key, value)
    }
    setSearchParams(next)
  }

  return (
    <div className="page">
      <div className="container">
        <div className="page-header row-between wrap">
          <div>
            <h1>Products</h1>
            <p className="muted" style={{ margin: 0 }}>
              {data ? `${data.total} product${data.total === 1 ? '' : 's'} available` : 'Loading catalog'}
            </p>
          </div>
        </div>

        <form
          className="row wrap"
          role="search"
          style={{ marginBottom: '1.5rem' }}
          onSubmit={(e) => {
            e.preventDefault()
            updateParams({ search: searchInput.trim(), page: null })
          }}
        >
          <label htmlFor="product-search" className="visually-hidden">
            Search products
          </label>
          <input
            id="product-search"
            className="input"
            style={{ maxWidth: 320 }}
            type="search"
            placeholder="Search products…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary">
            Search
          </button>

          <label htmlFor="category-filter" className="visually-hidden">
            Filter by category
          </label>
          <select
            id="category-filter"
            className="select"
            style={{ maxWidth: 220 }}
            value={category}
            onChange={(e) => updateParams({ category: e.target.value || null, page: null })}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {(search || category) && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setSearchInput('')
                setSearchParams({})
              }}
            >
              Clear filters
            </button>
          )}
        </form>

        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="center">
            <span className="spinner" aria-label="Loading products" />
          </div>
        ) : data && data.items.length > 0 ? (
          <>
            <div className="product-grid">
              {data.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              onChange={(p) => updateParams({ page: String(p) })}
            />
          </>
        ) : (
          !loading && (
            <div className="empty-state card">
              <h2>No products found</h2>
              <p>Try adjusting your search or clearing the filters.</p>
            </div>
          )
        )}
      </div>
    </div>
  )
}
