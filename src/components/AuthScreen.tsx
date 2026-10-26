import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { api, posterURL } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Logo } from './Logo'
import type { Movie } from '../types'

interface AuthScreenProps {
  title: string
  intro: string
  children: ReactNode
  footer: ReactNode
}

export function AuthScreen({ title, intro, children, footer }: AuthScreenProps) {
  const { user, loading } = useAuth()
  const [films, setFilms] = useState<Movie[]>([])

  useEffect(() => {
    let active = true
    void api
      .getTrending(1)
      .then((page) => {
        if (active) setFilms(page.results.slice(0, 4))
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  if (!loading && user) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="auth-screen">
      <section className="auth-stage">
        <Logo />
        <div className="auth-stage__copy">
          <p className="display-quote">Every film leaves a mark. Keep yours in one place.</p>
          <p>
            Follow the people whose taste you trust, rate what you watch, and build a living
            record of the films that stay with you.
          </p>
        </div>
        <div className="film-strip" aria-hidden="true">
          {films.length > 0
            ? films.map((film) => (
                <span className="film-strip__frame" key={film.tmdbId}>
                  {film.posterPath ? <img src={posterURL(film.posterPath, 'w342')} alt="" /> : <span />}
                </span>
              ))
            : Array.from({ length: 4 }, (_, index) => (
                <span className="film-strip__frame film-strip__frame--empty" key={index} />
              ))}
        </div>
        <p className="auth-stage__footer">Letterbox — a cinema journal</p>
      </section>

      <section className="auth-form-wrap">
        <div className="auth-form">
          <p className="auth-form__kicker">Members' entrance</p>
          <h1>{title}</h1>
          <p className="auth-form__intro">{intro}</p>
          {children}
          <div className="auth-form__footer">{footer}</div>
        </div>
      </section>
    </div>
  )
}
