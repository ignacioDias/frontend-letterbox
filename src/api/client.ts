import type {
  Movie,
  PaginatedMovies,
  PublicUser,
  Reaction,
  Review,
  ReviewInput,
  ReviewPatch,
  User,
} from '../types'

const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1'

export const AUTH_EXPIRED_EVENT = 'letterbox:auth-expired'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type RequestOptions = {
  method?: string
  body?: unknown
  signal?: AbortSignal
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? 'GET',
    credentials: 'include',
    signal: options.signal,
    headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  if (!response.ok) {
    const message = (await response.text()).trim() || `Request failed (${response.status})`
    if (response.status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/auth/register')) {
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
    }
    throw new ApiError(response.status, message)
  }

  const contentType = response.headers.get('Content-Type') ?? ''
  if (response.status === 204 || !contentType.includes('application/json')) {
    return undefined as T
  }

  return (await response.json()) as T
}

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value))
    }
  }
  const value = search.toString()
  return value ? `?${value}` : ''
}

function userPath(username: string): string {
  return `/users/username/${encodeURIComponent(username)}`
}

export const api = {
  register(input: {
    username: string
    email: string
    password: string
    country: string
    profilePicture?: string
  }): Promise<User> {
    return request('/auth/register', { method: 'POST', body: input })
  },

  login(emailOrUsername: string, password: string): Promise<User> {
    return request('/auth/login', { method: 'POST', body: { emailOrUsername, password } })
  },

  logout(): Promise<void> {
    return request('/auth/logout', { method: 'DELETE' })
  },

  me(): Promise<User> {
    return request('/users/me')
  },

  updateMe(input: { username: string; email: string; country: string; profilePicture: string }): Promise<void> {
    return request('/users/me', { method: 'PUT', body: input })
  },

  updatePassword(currentPassword: string, newPassword: string): Promise<void> {
    return request('/users/me/password', { method: 'PUT', body: { currentPassword, newPassword } })
  },

  deleteMe(): Promise<void> {
    return request('/users/me', { method: 'DELETE' })
  },

  getUser(username: string): Promise<PublicUser> {
    return request(userPath(username))
  },

  getUserByID(userID: number): Promise<PublicUser> {
    return request(`/users/${userID}`)
  },

  getFollowers(username: string, limit = 100, offset = 0): Promise<PublicUser[]> {
    return request(`${userPath(username)}/followers${query({ limit, offset })}`)
  },

  getFollowing(username: string, limit = 100, offset = 0): Promise<PublicUser[]> {
    return request(`${userPath(username)}/following${query({ limit, offset })}`)
  },

  getFollowersCount(username: string): Promise<{ count: number }> {
    return request(`${userPath(username)}/followers/count`)
  },

  getFollowingCount(username: string): Promise<{ count: number }> {
    return request(`${userPath(username)}/following/count`)
  },

  follow(username: string): Promise<void> {
    return request(`${userPath(username)}/follow`, { method: 'POST' })
  },

  unfollow(username: string): Promise<void> {
    return request(`${userPath(username)}/unfollow`, { method: 'DELETE' })
  },

  getFollowingFeed(limit = 20, offset = 0): Promise<Review[]> {
    return request(`/reviews/following${query({ limit, offset })}`)
  },

  getUserReviews(username: string, limit = 20, offset = 0): Promise<Review[]> {
    return request(`${userPath(username)}/reviews${query({ limit, offset })}`)
  },

  getMovieReviews(movieID: number, limit = 100, offset = 0): Promise<Review[]> {
    return request(`/movies/${movieID}/reviews${query({ limit, offset })}`)
  },

  getMovieAverage(movieID: number): Promise<{ averageRating: number }> {
    return request(`/movies/${movieID}/reviews/average`)
  },

  getMovieReviewCount(movieID: number): Promise<{ count: number }> {
    return request(`/movies/${movieID}/reviews/count`)
  },

  createReview(movieID: number, input: ReviewInput): Promise<Review> {
    return request(`/movies/${movieID}/reviews`, { method: 'POST', body: input })
  },

  updateReview(reviewID: number, input: ReviewPatch): Promise<Review> {
    return request(`/reviews/${reviewID}`, { method: 'PATCH', body: input })
  },

  deleteReview(reviewID: number): Promise<void> {
    return request(`/reviews/${reviewID}`, { method: 'DELETE' })
  },

  likeReview(reviewID: number): Promise<Reaction> {
    return request(`/reviews/${reviewID}/like`, { method: 'POST' })
  },

  dislikeReview(reviewID: number): Promise<Reaction> {
    return request(`/reviews/${reviewID}/dislike`, { method: 'POST' })
  },

  removeReaction(reviewID: number): Promise<void> {
    return request(`/reviews/${reviewID}/reaction`, { method: 'DELETE' })
  },

  getMovie(movieID: number, signal?: AbortSignal): Promise<Movie> {
    return request(`/movies/${movieID}`, { signal })
  },

  getSimilar(movieID: number, page = 1): Promise<PaginatedMovies> {
    return request(`/movies/${movieID}/similar${query({ page })}`)
  },

  getRecommendations(movieID: number, page = 1): Promise<PaginatedMovies> {
    return request(`/movies/${movieID}/recommendations${query({ page })}`)
  },

  searchMovies(search: string, page = 1): Promise<PaginatedMovies> {
    return request(`/movies/search${query({ search, page })}`)
  },

  getTrending(page = 1): Promise<PaginatedMovies> {
    return request(`/movies/trending${query({ page })}`)
  },
}

export function posterURL(posterPath: string, size: 'w342' | 'w500' | 'original' = 'w500'): string {
  if (!posterPath) return ''
  return `https://image.tmdb.org/t/p/${size}${posterPath}`
}
