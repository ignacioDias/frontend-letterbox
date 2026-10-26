import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Star, Trash2 } from 'lucide-react'
import { api, ApiError, posterURL } from '../api/client'
import { MovieGrid } from '../components/MovieGrid'
import { ReviewCard } from '../components/ReviewCard'
import { StarInput, Stars } from '../components/Stars'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { useAuth } from '../context/AuthContext'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useUsers } from '../hooks/useUsers'
import { peekUser, rememberMovie, rememberUser } from '../lib/cache'
import { fullDate, scoreLabel } from '../lib/format'
import type { Movie, PublicUser, Review } from '../types'

type SortOrder = 'recent' | 'highest' | 'lowest'

export function MoviePage() {
  const { movieId: rawMovieID } = useParams()
  const movieID = Number(rawMovieID)
  const validID = Number.isInteger(movieID) && movieID > 0 && movieID <= 2147483647
  const { user } = useAuth()
  const [movie, setMovie] = useState<Movie | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [average, setAverage] = useState(0)
  const [count, setCount] = useState(0)
  const [mine, setMine] = useState<Review | null>(null)
  const [recommendations, setRecommendations] = useState<Movie[]>([])
  const [sort, setSort] = useState<SortOrder>('recent')
  const [spoilerFree, setSpoilerFree] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [score, setScore] = useState(0)
  const [content, setContent] = useState('')
  const [spoilers, setSpoilers] = useState(false)
  const [saving, setSaving] = useState(false)
  const [composerError, setComposerError] = useState('')
  const [composerNote, setComposerNote] = useState('')
  const ratingRef = useRef<HTMLDivElement>(null)

  useDocumentTitle(movie?.title ?? 'Film')

  const load = useCallback(async () => {
    if (!validID) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    setNotFound(false)
    try {
      const movieData = rememberMovie(await api.getMovie(movieID))
      setMovie(movieData)
      const [movieReviews, averageResponse, countResponse, selfReviews, recs] = await Promise.all([
        api.getMovieReviews(movieID, 100, 0),
        api.getMovieAverage(movieID),
        api.getMovieReviewCount(movieID),
        user ? api.getUserReviews(user.username, 100, 0) : Promise.resolve<Review[]>([]),
        api.getRecommendations(movieID, 1).catch(() => null),
      ])
      setReviews(movieReviews)
      setAverage(averageResponse.averageRating)
      setCount(countResponse.count)
      const own = selfReviews.find((review) => review.movie_id === movieID) ?? movieReviews.find((review) => review.user_id === user?.id)
      setMine(own ?? null)
      setRecommendations(recs?.results.slice(0, 10) ?? [])
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 404) {
        setNotFound(true)
      } else {
        setError(cause instanceof Error ? cause.message : 'Could not load this film.')
      }
    } finally {
      setLoading(false)
    }
  }, [movieID, user, validID])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (mine) {
      setScore(mine.score)
      setContent(mine.content)
      setSpoilers(mine.containsSpoilers)
    } else {
      setScore(0)
      setContent('')
      setSpoilers(false)
    }
    setComposerError('')
    setComposerNote('')
  }, [mine?.id])

  const reviewUserIDs = useMemo(() => reviews.slice(0, 24).map((review) => review.user_id), [reviews])
  const reviewUsers = useUsers(reviewUserIDs)

  const ordered = useMemo(() => {
    const list = reviews.filter((review) => !spoilerFree || !review.containsSpoilers)
    if (sort === 'recent') return list
    return [...list].sort((a, b) => {
      if (sort === 'highest') {
        return b.score - a.score || new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      }
      return a.score - b.score || new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })
  }, [reviews, sort, spoilerFree])

  function authorFor(review: Review): PublicUser | undefined {
    if (user && review.user_id === user.id) {
      return {
        id: user.id,
        username: user.username,
        profilePictureURL: user.profilePictureURL,
        country: user.country,
      }
    }
    return reviewUsers[review.user_id] ?? peekUser(review.user_id)
  }

  async function refreshReviewData() {
    const [movieReviews, averageResponse, countResponse] = await Promise.all([
      api.getMovieReviews(movieID, 100, 0),
      api.getMovieAverage(movieID),
      api.getMovieReviewCount(movieID),
    ])
    setReviews(movieReviews)
    setAverage(averageResponse.averageRating)
    setCount(countResponse.count)
    return movieReviews
  }

  async function saveReview() {
    if (!user) return
    if (score < 1 || score > 10) {
      setComposerError('Choose a score from 1 to 10 before publishing.')
      return
    }
    setSaving(true)
    setComposerError('')
    setComposerNote('')
    try {
      const saved = mine
        ? await api.updateReview(mine.id, {
            score,
            content,
            containsSpoilers: spoilers,
          })
        : await api.createReview(movieID, {
            score,
            content,
            containsSpoilers: spoilers,
          })
      setMine(saved)
      rememberUser({
        id: user.id,
        username: user.username,
        profilePictureURL: user.profilePictureURL,
        country: user.country,
      })
      await refreshReviewData()
      setComposerNote(mine ? 'Your review has been updated.' : 'Your review is now in the room.')
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        setComposerError('You already have a review for this film.')
      } else {
        setComposerError(cause instanceof Error ? cause.message : 'Could not save your review.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function deleteOwnReview() {
    if (!mine) return
    if (!window.confirm('Delete your review for this film?')) return
    setSaving(true)
    setComposerError('')
    setComposerNote('')
    try {
      await api.deleteReview(mine.id)
      setMine(null)
      await refreshReviewData()
      setComposerNote('Your review has been removed.')
    } catch (cause) {
      setComposerError(cause instanceof Error ? cause.message : 'Could not delete your review.')
    } finally {
      setSaving(false)
    }
  }

  function scrollToRating() {
    ratingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    ratingRef.current?.focus({ preventScroll: true })
  }

  if (loading) {
    return <LoadingState label="Threading the projector" />
  }

  if (notFound) {
    return (
      <div className="page">
        <EmptyState title="This film is not in the archive" action={{ label: 'Search for a film', to: '/explore' }}>
          The film may have been removed from TMDB, or the link points to an invalid ID.
        </EmptyState>
      </div>
    )
  }

  if (error || !movie) {
    return <ErrorState message={error || 'Could not load this film.'} onRetry={() => void load()} />
  }

  const poster = posterURL(movie.posterPath)

  return (
    <div className="page movie-page">
      <Link className="back-link" to="/explore">
        <ArrowLeft size={16} aria-hidden="true" /> Back to explore
      </Link>

      <header className="movie-hero">
        <div className="movie-hero__poster">
          {poster ? <img src={poster} alt={`${movie.title} poster`} /> : <span>{movie.title}</span>}
        </div>
        <div className="movie-hero__body">
          <p className="movie-hero__kicker">Now in the archive</p>
          <h1>{movie.title}</h1>
          <div className="movie-hero__scoreline">
            <div className="movie-hero__average">
              <strong>{count > 0 ? average.toFixed(1) : '—'}</strong>
              <span>/10</span>
            </div>
            <div>
              <Stars score={average} />
              <p>
                {count} {count === 1 ? 'review' : 'reviews'} from the Letterbox room
              </p>
            </div>
          </div>
          <dl className="movie-hero__facts">
            <div>
              <dt>
                <Star size={14} aria-hidden="true" /> Your score
              </dt>
              <dd>{mine ? `${mine.score}/10` : 'Not rated yet'}</dd>
            </div>
            <div>
              <dt>
                <CalendarDays size={14} aria-hidden="true" /> Added
              </dt>
              <dd>{fullDate(movie.cachedAt)}</dd>
            </div>
          </dl>
          <div className="movie-hero__actions">
            <button type="button" className="button button--accent" onClick={scrollToRating}>
              {mine ? 'Edit your review' : 'Rate this film'}
            </button>
            {mine ? (
              <button type="button" className="button button--ghost" onClick={() => void deleteOwnReview()} disabled={saving}>
                <Trash2 size={15} aria-hidden="true" /> Remove review
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="movie-layout">
        <section className="movie-reviews" aria-labelledby="reviews-heading">
          <div className="section-head section-head--stacked">
            <h2 id="reviews-heading">From the room</h2>
            <div className="review-tools">
              <label className="select-field">
                <span className="visually-hidden">Sort reviews</span>
                <select value={sort} onChange={(event) => setSort(event.target.value as SortOrder)}>
                  <option value="recent">Most recent</option>
                  <option value="highest">Highest score</option>
                  <option value="lowest">Lowest score</option>
                </select>
              </label>
              <label className="checkbox">
                <input type="checkbox" checked={spoilerFree} onChange={(event) => setSpoilerFree(event.target.checked)} />
                <span>Hide spoilers</span>
              </label>
            </div>
          </div>

          {ordered.length === 0 ? (
            <EmptyState title="No notes yet">Be the first to leave a review for this film.</EmptyState>
          ) : (
            <div className="review-list">
              {ordered.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  author={authorFor(review)}
                  onDeleted={(id) => {
                    setReviews((current) => current.filter((item) => item.id !== id))
                    if (mine?.id === id) setMine(null)
                    void refreshReviewData()
                  }}
                />
              ))}
            </div>
          )}

          {count > reviews.length ? (
            <p className="muted-note">
              Showing the newest {reviews.length} of {count} reviews.
            </p>
          ) : null}
        </section>

        <aside className="rating-panel" ref={ratingRef} tabIndex={-1} aria-labelledby="rating-heading">
          <div className="rating-panel__head">
            <p className="rating-panel__kicker">{mine ? 'Your ticket' : 'Add your ticket'}</p>
            <h2 id="rating-heading">{mine ? 'Edit your review' : 'Rate this film'}</h2>
          </div>

          {!user ? (
            <div className="rating-panel__guest">
              <p>Sign in to score this film and leave a note for the next viewer.</p>
              <Link className="button button--accent button--wide" to="/login">
                Sign in to rate
              </Link>
            </div>
          ) : (
            <form
              className="rating-form"
              onSubmit={(event) => {
                event.preventDefault()
                void saveReview()
              }}
            >
              <StarInput value={score} onChange={setScore} disabled={saving} />
              <p className="rating-form__readout">
                {score > 0 ? (
                  <>
                    <strong>{score}</strong>/10 <span>{scoreLabel(score)}</span>
                  </>
                ) : (
                  <span>Tap a star, from one to ten.</span>
                )}
              </p>
              <label className="field">
                <span>Your note (optional)</span>
                <textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  maxLength={10000}
                  rows={5}
                  placeholder="What stayed with you?"
                />
                <small>{content.length.toLocaleString()}/10,000</small>
              </label>
              <label className="checkbox">
                <input type="checkbox" checked={spoilers} onChange={(event) => setSpoilers(event.target.checked)} />
                <span>This review contains spoilers</span>
              </label>
              {composerError ? (
                <p className="form__error" role="alert">
                  {composerError}
                </p>
              ) : null}
              {composerNote ? (
                <p className="form__success" role="status">
                  {composerNote}
                </p>
              ) : null}
              <button className="button button--accent button--wide" type="submit" disabled={saving || score === 0}>
                {saving ? 'Saving…' : mine ? 'Save review' : 'Publish review'}
              </button>
              {mine ? (
                <button type="button" className="button button--danger-quiet button--wide" disabled={saving} onClick={() => void deleteOwnReview()}>
                  Delete review
                </button>
              ) : null}
            </form>
          )}
        </aside>
      </div>

      {recommendations.length > 0 ? (
        <section className="movie-related" aria-labelledby="related-heading">
          <div className="section-head">
            <h2 id="related-heading">After this, try</h2>
            <span className="section-head__rule" aria-hidden="true" />
          </div>
          <MovieGrid movies={recommendations} />
        </section>
      ) : null}
    </div>
  )
}
