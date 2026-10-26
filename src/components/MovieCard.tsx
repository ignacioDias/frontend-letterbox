import { useState } from 'react'
import { Link } from 'react-router-dom'
import { posterURL } from '../api/client'
import { cx } from '../lib/format'
import type { Movie } from '../types'

interface MovieCardProps {
  movie: Movie
  rank?: number
  compact?: boolean
}

export function MovieCard({ movie, rank, compact }: MovieCardProps) {
  const [failed, setFailed] = useState(false)
  const poster = posterURL(movie.posterPath)

  return (
    <article className={cx('movie-card', compact && 'movie-card--compact')}>
      {rank ? <span className="movie-card__rank">{String(rank).padStart(2, '0')}</span> : null}
      <Link className="movie-card__link" to={`/movies/${movie.tmdbId}`}>
        <span className="movie-card__poster">
          {poster && !failed ? (
            <img src={poster} alt={`${movie.title} poster`} loading="lazy" onError={() => setFailed(true)} />
          ) : (
            <span className="movie-card__fallback">{movie.title}</span>
          )}
        </span>
        <span className="movie-card__title">{movie.title}</span>
      </Link>
    </article>
  )
}
