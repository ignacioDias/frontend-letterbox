import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Search, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { MovieGrid } from '../components/MovieGrid'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import type { Movie, PaginatedMovies } from '../types'

export function ExplorePage() {
  const [params, setParams] = useSearchParams()
  const query = (params.get('q') ?? '').trim()
  useDocumentTitle(query ? `Search: ${query}` : 'Explore')

  return (
    <div className="page explore-page">
      <header className="page-head page-head--explore">
        <div>
          <p className="page-head__kicker">Explore</p>
          <h1 className="page-title">Look up a film</h1>
        </div>
      </header>

      <SearchForm
        initialValue={query}
        onSubmit={(value) => {
          if (value) {
            setParams({ q: value })
          } else {
            setParams({})
          }
        }}
        onClear={() => setParams({})}
      />

      <MovieResults query={query} key={query} />
    </div>
  )
}

function SearchForm({
  initialValue,
  onSubmit,
  onClear,
}: {
  initialValue: string
  onSubmit: (value: string) => void
  onClear: () => void
}) {
  const [value, setValue] = useState(initialValue)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit(value.trim())
  }

  return (
    <form className="search-form" role="search" onSubmit={submit}>
      <Search size={22} aria-hidden="true" />
      <label className="visually-hidden" htmlFor="film-search">
        Search for a film
      </label>
      <input
        id="film-search"
        ref={inputRef}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search by title…"
        autoComplete="off"
        enterKeyHint="search"
      />
      {value ? (
        <button
          type="button"
          className="search-form__clear"
          aria-label="Clear search"
          onClick={() => {
            setValue('')
            onClear()
            inputRef.current?.focus()
          }}
        >
          <X size={17} aria-hidden="true" />
        </button>
      ) : null}
      <button type="submit" className="button button--accent button--small">
        Search
      </button>
    </form>
  )
}

function MovieResults({ query }: { query: string }) {
  const [data, setData] = useState<PaginatedMovies | null>(null)
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const requestRef = useRef(0)

  useEffect(() => {
    const requestID = ++requestRef.current
    setLoading(true)
    setError('')
    setData(null)
    setMovies([])
    const fetchPage = query ? api.searchMovies(query, 1) : api.getTrending(1)
    void fetchPage
      .then((page) => {
        if (requestRef.current !== requestID) return
        setData(page)
        setMovies(page.results)
      })
      .catch((cause: unknown) => {
        if (requestRef.current !== requestID) return
        setError(cause instanceof Error ? cause.message : 'Could not load films.')
      })
      .finally(() => {
        if (requestRef.current === requestID) setLoading(false)
      })
  }, [query])

  async function loadMore() {
    if (!data || data.page >= data.totalPages) return
    const nextPage = data.page + 1
    setLoadingMore(true)
    setError('')
    try {
      const page = query ? await api.searchMovies(query, nextPage) : await api.getTrending(nextPage)
      setData(page)
      setMovies((current) => [...current, ...page.results])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load more films.')
    } finally {
      setLoadingMore(false)
    }
  }

  if (loading) {
    return <LoadingState label={query ? 'Searching the stacks' : 'Checking the marquee'} />
  }

  if (error && movies.length === 0) {
    return <ErrorState message={error} onRetry={() => window.location.reload()} />
  }

  if (movies.length === 0) {
    return (
      <EmptyState title={query ? `No films found for “${query}”` : 'Nothing on the marquee'}>
        {query ? 'Try a shorter title, or check the spelling. The search reaches the entire TMDB catalogue.' : 'Trending titles are unavailable right now.'}
      </EmptyState>
    )
  }

  return (
    <section className="explore-results" aria-labelledby="results-heading">
      <div className="section-head">
        <h2 id="results-heading">{query ? `Results for “${query}”` : 'Trending today'}</h2>
        <span className="section-head__rule" aria-hidden="true" />
        <span className="section-head__count">
          {data ? `${data.totalResults.toLocaleString()} ${data.totalResults === 1 ? 'film' : 'films'}` : ''}
        </span>
      </div>

      <MovieGrid movies={movies} ranked={!query} rankOffset={0} />

      {error ? <p className="inline-error">{error}</p> : null}

      {data && data.page < data.totalPages ? (
        <div className="page-actions">
          <button type="button" className="button button--ghost" disabled={loadingMore} onClick={() => void loadMore()}>
            {loadingMore ? 'Loading…' : 'Load more films'}
          </button>
        </div>
      ) : null}
    </section>
  )
}
