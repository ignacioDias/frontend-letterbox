import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Film, Star, Users } from 'lucide-react'
import { api, posterURL } from '../api/client'
import { Avatar } from '../components/Avatar'
import { Flag } from '../components/Flag'
import { MovieGrid } from '../components/MovieGrid'
import { ReviewCard } from '../components/ReviewCard'
import { Stars } from '../components/Stars'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { useAuth } from '../context/AuthContext'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useMovies } from '../hooks/useMovies'
import { rememberUsers } from '../lib/cache'
import { fullDate, relativeTime } from '../lib/format'
import type { Movie, PaginatedMovies, PublicUser, Review } from '../types'

export function HomePage() {
  useDocumentTitle('Home')
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingState label="Opening the house" />
  }

  if (!user) {
    return <LandingPage />
  }

  return <FollowingFeed username={user.username} />
}

function FollowingFeed({ username }: { username: string }) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [authors, setAuthors] = useState<Record<number, PublicUser>>({})
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [hasMore, setHasMore] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [feed, following] = await Promise.all([
        api.getFollowingFeed(20, 0),
        api.getFollowing(username, 100, 0),
      ])
      rememberUsers(following)
      const map: Record<number, PublicUser> = {}
      for (const person of following) map[person.id] = person
      setAuthors(map)
      setReviews(feed)
      setHasMore(feed.length === 20)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load your feed.')
    } finally {
      setLoading(false)
    }
  }, [username])

  useEffect(() => {
    void load()
  }, [load])

  async function loadMore() {
    setLoadingMore(true)
    setError('')
    try {
      const feed = await api.getFollowingFeed(20, reviews.length)
      setReviews((current) => [...current, ...feed])
      setHasMore(feed.length === 20)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load more reviews.')
    } finally {
      setLoadingMore(false)
    }
  }

  const movieIDs = useMemo(() => reviews.map((review) => review.movie_id), [reviews])
  const movies = useMovies(movieIDs)

  if (loading) {
    return <LoadingState label="Gathering your circle" />
  }

  if (error && reviews.length === 0) {
    return <ErrorState message={error} onRetry={() => void load()} />
  }

  const featured = reviews[0]
  const rest = reviews.slice(1)

  return (
    <div className="page home-page">
      <header className="page-head">
        <div>
          <p className="page-head__kicker">Your circle</p>
          <h1 className="page-title">What your people are watching</h1>
        </div>
        <Link className="text-link" to="/explore">
          Explore films <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </header>

      {reviews.length === 0 ? (
        <EmptyState
          title="Your circle is quiet"
          action={{ label: 'Find a film to rate', to: '/explore' }}
        >
          Follow a few film lovers and their reviews will land here. In the meantime, explore what is
          trending and start your own record.
        </EmptyState>
      ) : (
        <>
          {featured ? (
            <FeaturedReview
              review={featured}
              movie={movies[featured.movie_id]}
              author={authors[featured.user_id]}
              onDeleted={(id) => setReviews((current) => current.filter((review) => review.id !== id))}
            />
          ) : null}

          {rest.length > 0 ? (
            <section className="feed" aria-labelledby="feed-heading">
              <div className="section-head">
                <h2 id="feed-heading">More from your circle</h2>
                <span className="section-head__rule" aria-hidden="true" />
                <span className="section-head__count">{rest.length} shown</span>
              </div>
              <div className="review-list">
                {rest.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    author={authors[review.user_id]}
                    movie={movies[review.movie_id]}
                    showMovie
                    onDeleted={(id) => setReviews((current) => current.filter((item) => item.id !== id))}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {hasMore ? (
            <div className="page-actions">
              <button type="button" className="button button--ghost" disabled={loadingMore} onClick={() => void loadMore()}>
                {loadingMore ? 'Loading…' : 'Load older reviews'}
              </button>
            </div>
          ) : null}
        </>
      )}

      {error ? <p className="inline-error">{error}</p> : null}
    </div>
  )
}

function FeaturedReview({
  review,
  movie,
  author,
  onDeleted,
}: {
  review: Review
  movie?: Movie
  author?: PublicUser
  onDeleted: (id: number) => void
}) {
  const { user } = useAuth()

  return (
    <section className="feature" aria-label="Latest review from your circle">
      <div className="feature__poster">
        {movie?.posterPath ? (
          <img src={posterURL(movie.posterPath, 'w500')} alt={`${movie.title} poster`} />
        ) : (
          <span className="feature__poster-fallback">{movie?.title ?? `Film #${review.movie_id}`}</span>
        )}
        <span className="feature__stamp" aria-hidden="true">
          <Star size={14} fill="currentColor" />
          {review.score}/10
        </span>
      </div>
      <div className="feature__body">
        <p className="feature__kicker">Latest from your circle</p>
        <h2>
          <Link to={`/movies/${review.movie_id}`}>{movie?.title ?? `Film #${review.movie_id}`}</Link>
        </h2>
        <div className="feature__byline">
          <Avatar username={author?.username ?? 'Member'} src={author?.profilePictureURL} size="sm" />
          <span>
            {author ? (
              <Link to={`/u/${author.username}`}>
                {author.username} <Flag country={author.country} />
              </Link>
            ) : (
              <span>{`Member #${review.user_id}`}</span>
            )}
            <time dateTime={review.updated_at} title={fullDate(review.updated_at)}>
              {relativeTime(review.updated_at)}
            </time>
          </span>
        </div>
        <Stars score={review.score} />
        {review.content ? (
          <blockquote>
            {review.containsSpoilers ? 'This review contains spoilers. Open the film page to read it in context.' : review.content}
          </blockquote>
        ) : (
          <p className="feature__score-only">Rated without a note.</p>
        )}
        <div className="feature__actions">
          <Link className="button button--accent" to={`/movies/${review.movie_id}`}>
            Open film
          </Link>
          {user?.id === review.user_id ? (
            <button
              type="button"
              className="text-link text-link--danger"
              onClick={() => {
                if (window.confirm('Delete this review? This cannot be undone.')) {
                  void api
                    .deleteReview(review.id)
                    .then(() => onDeleted(review.id))
                    .catch(() => undefined)
                }
              }}
            >
              Delete
            </button>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function LandingPage() {
  const [trending, setTrending] = useState<PaginatedMovies | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void api
      .getTrending(1)
      .then((page) => {
        if (active) setTrending(page)
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load trending films.')
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="page landing">
      <section className="landing-hero">
        <div className="landing-hero__copy">
          <p className="landing-hero__kicker">A social cinema journal</p>
          <h1>Every film leaves a mark. Keep yours in one place.</h1>
          <p className="landing-hero__lede">
            Letterbox is a quieter corner of the internet for people who love films. Follow good
            taste, rate what you see, and leave a note for the next person in the dark.
          </p>
          <div className="landing-hero__actions">
            <Link className="button button--accent" to="/register">
              Start your journal
            </Link>
            <Link className="button button--ghost" to="/login">
              Sign in
            </Link>
          </div>
        </div>
        <div className="landing-hero__posters" aria-hidden="true">
          {(trending?.results ?? []).slice(0, 3).map((movie, index) => (
            <span className={`landing-poster landing-poster--${index + 1}`} key={movie.tmdbId}>
              {movie.posterPath ? <img src={posterURL(movie.posterPath, 'w342')} alt="" /> : <span>{movie.title}</span>}
            </span>
          ))}
          {!trending ? <span className="landing-poster landing-poster--1" /> : null}
        </div>
      </section>

      <section className="landing-habit" aria-labelledby="habit-heading">
        <div className="section-head">
          <h2 id="habit-heading">The whole habit</h2>
          <span className="section-head__rule" aria-hidden="true" />
        </div>
        <div className="habit-grid">
          <div className="habit">
            <Users size={20} aria-hidden="true" />
            <h3>Follow taste</h3>
            <p>Build a feed from the people you trust, not a machine guessing at your attention.</p>
          </div>
          <div className="habit">
            <Star size={20} aria-hidden="true" />
            <h3>Rate the screening</h3>
            <p>Ten stars, one score. Add a note when a film gives you something to say.</p>
          </div>
          <div className="habit">
            <Film size={20} aria-hidden="true" />
            <h3>Keep the record</h3>
            <p>Your profile becomes a ledger of everything watched, loved, and argued about.</p>
          </div>
        </div>
      </section>

      <section className="landing-trending" aria-labelledby="trending-heading">
        <div className="section-head">
          <h2 id="trending-heading">Playing now</h2>
          <span className="section-head__rule" aria-hidden="true" />
          <Link className="text-link" to="/explore">
            See all
          </Link>
        </div>
        {error ? <ErrorState message={error} /> : null}
        {!trending && !error ? <LoadingState label="Checking the marquee" /> : null}
        {trending ? <MovieGrid movies={trending.results.slice(0, 10)} ranked /> : null}
      </section>
    </div>
  )
}
