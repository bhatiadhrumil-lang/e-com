import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { Paginated, Product } from '../types'
import ProductCard from '../components/ProductCard'

export default function HomePage() {
  const [featured, setFeatured] = useState<Product[]>([])

  useEffect(() => {
    api<Paginated<Product>>('/products?pageSize=4')
      .then((data) => setFeatured(data.items))
      .catch(() => setFeatured([]))
  }, [])

  return (
    <div className="page">
      <div className="container">
        <section className="hero">
          <h1>Tech gear, ordered in seconds</h1>
          <p>
            Nimbus Store is the storefront demo for the Cloud-Native Order Processing Platform —
            a portfolio project covering containers, Kubernetes, and infrastructure as code.
          </p>
          <div className="row">
            <Link to="/products" className="btn btn-primary btn-lg">
              Browse products
            </Link>
            <Link to="/register" className="btn btn-secondary btn-lg">
              Create an account
            </Link>
          </div>
        </section>

        <h2 className="section-title">Featured products</h2>
        {featured.length === 0 ? (
          <p className="muted">
            No products available yet. Start the backend and run the database seed — see the
            README for setup steps.
          </p>
        ) : (
          <div className="product-grid">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        <div className="row wrap" style={{ marginTop: '2rem', gap: '1rem' }}>
          <Feature
            title="Secure accounts"
            text="Passwords are hashed with bcrypt; APIs are protected with JWT bearer tokens."
          />
          <Feature
            title="Real cart & checkout"
            text="Server-side cart, stock checks, and transactional order placement."
          />
          <Feature
            title="Built to deploy"
            text="Designed from day one to be containerized and run on Kubernetes."
          />
        </div>
      </div>
    </div>
  )
}

function Feature({ title, text }: { title: string; text: string }) {
  return (
    <div className="card grow" style={{ padding: '1.1rem 1.25rem' }}>
      <h3 style={{ fontSize: '1rem' }}>{title}</h3>
      <p className="small muted" style={{ margin: 0 }}>
        {text}
      </p>
    </div>
  )
}
