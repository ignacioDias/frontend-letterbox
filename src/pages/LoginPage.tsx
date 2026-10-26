import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { AuthScreen } from '../components/AuthScreen'
import { useAuth } from '../context/AuthContext'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export function LoginPage() {
  useDocumentTitle('Sign in')
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [emailOrUsername, setEmailOrUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(emailOrUsername.trim(), password)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from !== '/login' ? from : '/', { replace: true })
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        setError('That username or password does not match. Try again.')
      } else {
        setError(cause instanceof Error ? cause.message : 'Could not sign in.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthScreen
      title="Sign in"
      intro="Pick up where you left off: the feed, your watchlist of opinions, and the people you follow."
      footer={
        <p>
          New to Letterbox? <Link to="/register">Create an account</Link>
        </p>
      }
    >
      <form className="form" onSubmit={(event) => void submit(event)}>
        {error ? (
          <p className="form__error" role="alert">
            {error}
          </p>
        ) : null}
        <label className="field">
          <span>Email or username</span>
          <input
            name="emailOrUsername"
            autoComplete="username"
            value={emailOrUsername}
            onChange={(event) => setEmailOrUsername(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <button className="button button--accent button--wide" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthScreen>
  )
}
