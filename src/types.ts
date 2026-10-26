export interface User {
  id: number
  username: string
  email: string
  profilePictureURL: string
  country: string
}

export interface PublicUser {
  id: number
  username: string
  profilePictureURL: string
  country: string
}

export interface Review {
  id: number
  user_id: number
  movie_id: number
  score: number
  content: string
  containsSpoilers: boolean
  created_at: string
  updated_at: string
}

export interface Movie {
  tmdbId: number
  title: string
  posterPath: string
  cachedAt: string
}

export interface PaginatedMovies {
  page: number
  totalPages: number
  totalResults: number
  results: Movie[]
}

export interface Reaction {
  target_id: number
  user_id: number
  value: 1 | -1
  created_at: string
}

export interface ReviewInput {
  score: number
  content: string
  containsSpoilers: boolean
}

export type ReviewPatch = Partial<ReviewInput>
