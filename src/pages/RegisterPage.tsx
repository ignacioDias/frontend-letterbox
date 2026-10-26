import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { AuthScreen } from '../components/AuthScreen'
import { useAuth } from '../context/AuthContext'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export function RegisterPage() {
  useDocumentTitle('Create an account')
  const { register } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [country, setCountry] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!/^[A-Za-z0-9_]{3,20}$/.test(username.trim())) {
      setError('Usernames are 3–20 letters, numbers, or underscores.')
      return
    }
    if (password.length < 8 || password.length > 72) {
      setError('Passwords must be 8–72 characters.')
      return
    }
    if (password !== confirm) {
      setError('The passwords do not match.')
      return
    }
    if (country && !/^[A-Za-z]{2}$/.test(country.trim())) {
      setError('Country must be a two-letter code, such as AR or US.')
      return
    }
    setBusy(true)
    try {
      await register({
        username: username.trim(),
        email: email.trim(),
        password,
        country: country.trim().toUpperCase(),
      })
      navigate('/', { replace: true })
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        setError('That username or email is already taken.')
      } else if (cause instanceof ApiError && cause.status === 400) {
        setError('Check the details above. The server did not accept one of the fields.')
      } else {
        setError(cause instanceof Error ? cause.message : 'Could not create the account.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthScreen
      title="Create your account"
      intro="A clean page, a place for every rating, and a feed shaped by people rather than an algorithm."
      footer={
        <p>
          Already a member? <Link to="/login">Sign in</Link>
        </p>
      }
    >
      <form className="form" onSubmit={(event) => void submit(event)}>
        {error ? (
          <p className="form__error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="form__row">
          <label className="field">
            <span>Username</span>
            <input
              name="username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              minLength={3}
              maxLength={20}
              required
            />
            <small>3–20 letters, numbers, or underscores.</small>
          </label>
          <label className="field">
            <span>Country</span>
            <input
              name="country"
              autoComplete="country"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              maxLength={2}
              placeholder="AR"
            />
            <small>Optional two-letter code.</small>
          </label>
        </div>
        <label className="field">
          <span>Email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <div className="form__row">
          <label className="field">
            <span>Password</span>
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              maxLength={72}
              required
            />
          </label>
          <label className="field">
            <span>Confirm password</span>
            <input
              name="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              minLength={8}
              maxLength={72}
              required
            />
          </label>
        </div>
        <button className="button button--accent button--wide" type="submit" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthScreen>
  )
}
