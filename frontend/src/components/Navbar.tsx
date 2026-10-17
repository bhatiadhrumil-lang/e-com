import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { itemCount } = useCart()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const close = () => setOpen(false)

  function handleLogout() {
    logout()
    close()
    navigate('/')
  }

  return (
    <header className="site-header">
      <div className="container">
        <Link to="/" className="brand" onClick={close}>
          Nimbus<span>Store</span>
        </Link>

        <button
          type="button"
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="primary-nav"
          aria-label="Toggle navigation menu"
          onClick={() => setOpen((v) => !v)}
        >
          Menu
        </button>

        <nav id="primary-nav" className={`nav-links${open ? ' open' : ''}`} aria-label="Primary">
          <NavLink to="/" className="nav-link" onClick={close} end>
            Home
          </NavLink>
          <NavLink to="/products" className="nav-link" onClick={close}>
            Products
          </NavLink>
          <NavLink to="/cart" className="nav-link cart-link" onClick={close}>
            Cart
            {itemCount > 0 && (
              <span className="cart-badge" aria-label={`${itemCount} items in cart`}>
                {itemCount}
              </span>
            )}
          </NavLink>
          {user && (
            <NavLink to="/orders" className="nav-link" onClick={close}>
              Orders
            </NavLink>
          )}

          <span className="nav-spacer" />

          {user ? (
            <div className="row">
              <span className="small muted" title={user.email}>
                Hi, {user.name.split(' ')[0]}
              </span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
                Log out
              </button>
            </div>
          ) : (
            <div className="row">
              <NavLink to="/login" className="nav-link" onClick={close}>
                Log in
              </NavLink>
              <Link to="/register" className="btn btn-primary btn-sm" onClick={close}>
                Sign up
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}
