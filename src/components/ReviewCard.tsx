import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react'
import { api, posterURL } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { cx, fullDate, relativeTime } from '../lib/format'
import type { Movie, PublicUser, Review } from '../types'
import { Avatar } from './Avatar'
import { Stars } from './Stars'

interface ReviewCardProps {
  review: Review
  author?: PublicUser
  movie?: Movie
  movieHref?: string
  showAuthor?: boolean
  showMovie?: boolean
  onDeleted?: (id: number) => void
  className?: string
}

export function ReviewCard({
  review,
  author,
  movie,
  movieHref,
  showAuthor = true,
  showMovie = false,
  onDeleted,
  className,
}: ReviewCardProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [reaction, setReaction] = useState<'like' | 'dislike' | null>(null)
  const [revealed, setRevealed] = useState(!review.containsSpoilers)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const isOwn = user?.id === review.user_id
  const displayName = author?.username ?? (isOwn ? user?.username : `Member #${review.user_id}`) ?? `Member #${review.user_id}`
  const authorTarget = author ? `/u/${author.username}` : isOwn && user ? `/u/${user.username}` : undefined
  const edited = new Date(review.updated_at).getTime() - new Date(review.created_at).getTime() > 60_000

  async function react(next: 'like' | 'dislike') {
    if (!user) {
      navigate('/login', { state: { from: location.pathname } })
      return
    }
    setBusy(true)
    setError('')
    try {
      if (reaction === next) {
        await api.removeReaction(review.id)
        setReaction(null)
      } else {
        if (next === 'like') {
          await api.likeReview(review.id)
        } else {
          await api.dislikeReview(review.id)
        }
        setReaction(next)
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save that reaction.')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!onDeleted) return
    if (!window.confirm('Delete this review? This cannot be undone.')) return
    setBusy(true)
    setError('')
    try {
      await api.deleteReview(review.id)
      onDeleted(review.id)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete this review.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className={cx('review-card', className)}>
      <header className="review-card__head">
        {showAuthor ? (
          <div className="review-card__author">
            <Avatar username={displayName} src={author?.profilePictureURL ?? (isOwn ? user?.profilePictureURL : '')} />
            <div>
              {authorTarget ? (
                <Link to={authorTarget} className="review-card__name">
                  {displayName}
                </Link>
              ) : (
                <span className="review-card__name">{displayName}</span>
              )}
              <p className="review-card__meta">
                rated <strong>{review.score}</strong> out of 10
                <span aria-hidden="true"> · </span>
                <time dateTime={review.updated_at} title={fullDate(review.updated_at)}>
                  {relativeTime(review.updated_at)}
                </time>
                {edited ? <span className="review-card__edited"> · edited</span> : null}
              </p>
            </div>
          </div>
        ) : null}
        <div className="review-card__score" aria-label={`${review.score} out of 10`}>
          <Stars score={review.score} size="sm" />
          <span>
            <strong>{review.score}</strong>/10
          </span>
        </div>
      </header>

      {showMovie ? (
        <Link className="review-card__film" to={movieHref ?? `/movies/${review.movie_id}`}>
          <span className="review-card__film-poster">
            {movie?.posterPath ? <img src={posterURL(movie.posterPath, 'w342')} alt="" loading="lazy" /> : null}
          </span>
          <span>
            <small>On</small>
            <strong>{movie?.title ?? `Film #${review.movie_id}`}</strong>
          </span>
        </Link>
      ) : null}

      {review.content ? (
        revealed ? (
          <p className="review-card__content">{review.content}</p>
        ) : (
          <div className="spoiler">
            <p aria-hidden={!revealed ? true : undefined}>{review.content}</p>
            <button type="button" className="spoiler__cover" onClick={() => setRevealed(true)}>
              <AlertTriangle size={18} aria-hidden="true" />
              Contains spoilers. Reveal review.
            </button>
          </div>
        )
      ) : (
        <p className="review-card__content review-card__content--empty">Rated without a note.</p>
      )}

      {error ? (
        <p className="review-card__error" role="alert">
          {error}
        </p>
      ) : null}

      <footer className="review-card__foot">
        <div className="review-card__actions">
          <button
            type="button"
            className={cx('icon-button', reaction === 'like' && 'is-active')}
            aria-pressed={reaction === 'like'}
            aria-label="Like this review"
            disabled={busy}
            onClick={() => void react('like')}
          >
            <ThumbsUp size={16} aria-hidden="true" />
            <span>Like</span>
          </button>
          <button
            type="button"
            className={cx('icon-button', reaction === 'dislike' && 'is-active')}
            aria-pressed={reaction === 'dislike'}
            aria-label="Dislike this review"
            disabled={busy}
            onClick={() => void react('dislike')}
          >
            <ThumbsDown size={16} aria-hidden="true" />
            <span>Dislike</span>
          </button>
        </div>
        {isOwn && onDeleted ? (
          <button type="button" className="icon-button icon-button--danger" onClick={() => void remove()} disabled={busy}>
            <Trash2 size={15} aria-hidden="true" />
            <span>Delete</span>
          </button>
        ) : null}
      </footer>
    </article>
  )
}
