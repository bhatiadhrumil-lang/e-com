import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { useAuth } from '../context/AuthContext'

interface FieldErrors {
  name?: string
  email?: string
  password?: string
}

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

  function validateClientSide(): FieldErrors {
    const errs: FieldErrors = {}
    if (!name.trim()) errs.name = 'Name is required'
    if (!email.trim()) errs.email = 'Email is required'
    if (password.length < 8) errs.password = 'Password must be at least 8 characters'
    return errs
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const errs = validateClientSide()
    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSubmitting(true)
    setError(null)
    try {
      await register({ name: name.trim(), email: email.trim(), password })
      navigate('/', { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        const next: FieldErrors = {}
        for (const detail of err.details ?? []) {
          const key = detail.field.replace(/^body\./, '') as keyof FieldErrors
          if (key in { name: 1, email: 1, password: 1 }) next[key] = detail.message
        }
        setFieldErrors(next)
      } else {
        setError('Registration failed. Please try again.')
      }
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <div className="container">
        <div className="form-card">
          <h1>Create your account</h1>
          <p className="sub">Join Nimbus Store to order gear and track your orders.</p>

          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label className="label" htmlFor="name">
                Full name
              </label>
              <input
                id="name"
                className="input"
                type="text"
                autoComplete="name"
                required
                aria-invalid={fieldErrors.name ? 'true' : undefined}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
            </div>
            <div className="field">
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                className="input"
                type="email"
                autoComplete="email"
                required
                aria-invalid={fieldErrors.email ? 'true' : undefined}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
            </div>
            <div className="field">
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                className="input"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                aria-invalid={fieldErrors.password ? 'true' : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {fieldErrors.password ? (
                <span className="field-error">{fieldErrors.password}</span>
              ) : (
                <span className="small muted">At least 8 characters.</span>
              )}
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="small muted" style={{ marginTop: '1.25rem', marginBottom: 0 }}>
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
