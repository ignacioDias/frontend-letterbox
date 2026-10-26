import type { Movie } from '../types'
import { MovieCard } from './MovieCard'

interface MovieGridProps {
  movies: Movie[]
  ranked?: boolean
  rankOffset?: number
}

export function MovieGrid({ movies, ranked, rankOffset = 0 }: MovieGridProps) {
  return (
    <div className="movie-grid">
      {movies.map((movie, index) => (
        <MovieCard
          key={movie.tmdbId}
          movie={movie}
          rank={ranked ? rankOffset + index + 1 : undefined}
        />
      ))}
    </div>
  )
}
