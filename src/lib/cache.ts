import type { Movie, PublicUser } from '../types'

const movies = new Map<number, Movie>()
const movieRequests = new Map<number, Promise<Movie>>()
const users = new Map<number, PublicUser>()
const userRequests = new Map<number, Promise<PublicUser>>()

export function rememberMovies(list: Movie[]) {
  for (const movie of list) {
    movies.set(movie.tmdbId, movie)
  }
}

export function rememberMovie(movie: Movie): Movie {
  movies.set(movie.tmdbId, movie)
  return movie
}

export function peekMovie(id: number): Movie | undefined {
  return movies.get(id)
}

export function loadMovie(id: number, loader: (id: number) => Promise<Movie>): Promise<Movie> {
  const cached = movies.get(id)
  if (cached) return Promise.resolve(cached)
  const pending = movieRequests.get(id)
  if (pending) return pending
  const request = loader(id)
    .then((movie) => {
      movies.set(id, movie)
      return movie
    })
    .finally(() => {
      movieRequests.delete(id)
    })
  movieRequests.set(id, request)
  return request
}

export function rememberUsers(list: PublicUser[]) {
  for (const user of list) {
    users.set(user.id, user)
  }
}

export function rememberUser(user: PublicUser) {
  users.set(user.id, user)
}

export function peekUser(id: number): PublicUser | undefined {
  return users.get(id)
}

export function loadUser(id: number, loader: (id: number) => Promise<PublicUser>): Promise<PublicUser> {
  const cached = users.get(id)
  if (cached) return Promise.resolve(cached)
  const pending = userRequests.get(id)
  if (pending) return pending
  const request = loader(id)
    .then((user) => {
      users.set(id, user)
      return user
    })
    .finally(() => {
      userRequests.delete(id)
    })
  userRequests.set(id, request)
  return request
}
