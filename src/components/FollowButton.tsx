import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { cx } from '../lib/format'
import type { PublicUser } from '../types'

interface FollowButtonProps {
  target: PublicUser
  following: boolean
  onChange: (following: boolean) => void
  className?: string
}

export function FollowButton({ target, following, onChange, className }: FollowButtonProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (user && user.id === target.id) {
    return null
  }

  if (!user) {
    return (
      <Link className={cx('button button--accent button--small', className)} to="/login" state={{ from: location.pathname }}>
        Follow
      </Link>
    )
  }

  async function toggle() {
    setBusy(true)
    setError('')
    try {
      if (following) {
        await api.unfollow(target.username)
        onChange(false)
      } else {
        await api.follow(target.username)
        onChange(true)
      }
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        onChange(!following)
      } else if (cause instanceof ApiError && cause.status === 401) {
        navigate('/login', { state: { from: location.pathname } })
      } else {
        setError(cause instanceof Error ? cause.message : 'Could not update follow.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className={cx('follow-wrap', className)}>
      <button
        type="button"
        className={cx('button button--small', following ? 'button--ghost' : 'button--accent')}
        aria-pressed={following}
        disabled={busy}
        onClick={() => void toggle()}
      >
        {busy ? 'Saving…' : following ? 'Following' : 'Follow'}
      </button>
      {error ? (
        <span className="follow-wrap__error" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  )
}
