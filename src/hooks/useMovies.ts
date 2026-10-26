import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { loadMovie, peekMovie } from '../lib/cache'
import type { Movie } from '../types'

export function useMovies(ids: number[]): Record<number, Movie> {
  const key = useMemo(() => Array.from(new Set(ids)).sort((a, b) => a - b).join(','), [ids])
  const [movies, setMovies] = useState<Record<number, Movie>>(() => {
    const initial: Record<number, Movie> = {}
    for (const id of ids) {
      const movie = peekMovie(id)
      if (movie) initial[id] = movie
    }
    return initial
  })

  useEffect(() => {
    if (!key) return
    let active = true
    const missing = key
      .split(',')
      .map(Number)
      .filter((id) => !peekMovie(id))
    if (missing.length === 0) {
      const found: Record<number, Movie> = {}
      for (const id of key.split(',').map(Number)) {
        const movie = peekMovie(id)
        if (movie) found[id] = movie
      }
      setMovies(found)
      return
    }
    void Promise.allSettled(missing.map((id) => loadMovie(id, (movieID) => api.getMovie(movieID)))).then(() => {
      if (!active) return
      const next: Record<number, Movie> = {}
      for (const id of key.split(',').map(Number)) {
        const movie = peekMovie(id)
        if (movie) next[id] = movie
      }
      setMovies(next)
    })
    return () => {
      active = false
    }
  }, [key])

  return movies
}
