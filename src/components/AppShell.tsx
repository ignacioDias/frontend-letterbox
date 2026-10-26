import { useEffect, useRef } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Compass, Home, LogIn, LogOut, UserRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { cx } from '../lib/format'
import { Avatar } from './Avatar'
import { Logo } from './Logo'

export function AppShell() {
  const { user, loading, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])

  async function signOut() {
    await logout()
    navigate('/')
  }

  const linkClass = ({ isActive }: { isActive: boolean }) => cx('nav-link', isActive && 'is-active')

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <aside className="rail">
        <Logo />
        <nav className="rail__nav" aria-label="Primary">
          <NavLink to="/" end className={linkClass}>
            <Home size={18} aria-hidden="true" />
            <span>Home</span>
          </NavLink>
          <NavLink to="/explore" className={linkClass}>
            <Compass size={18} aria-hidden="true" />
            <span>Explore</span>
          </NavLink>
          {user ? (
            <NavLink to="/profile" className={linkClass}>
              <UserRound size={18} aria-hidden="true" />
              <span>Profile</span>
            </NavLink>
          ) : (
            <NavLink to="/login" className={linkClass}>
              <LogIn size={18} aria-hidden="true" />
              <span>Sign in</span>
            </NavLink>
          )}
        </nav>

        <div className="rail__foot">
          {user ? (
            <div className="rail__user">
              <Link to="/profile" className="rail__identity">
                <Avatar username={user.username} src={user.profilePictureURL} size="sm" />
                <span>
                  <strong>{user.username}</strong>
                  <small>{loading ? 'Syncing' : 'Signed in'}</small>
                </span>
              </Link>
              <button type="button" className="icon-button" aria-label="Sign out" onClick={() => void signOut()}>
                <LogOut size={16} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <Link className="button button--accent rail__signin" to="/login">
              Sign in
            </Link>
          )}
          <p className="rail__note">A record of every screening.</p>
        </div>
      </aside>

      <header className="mobile-head">
        <Logo />
        {user ? (
          <Link to="/profile" aria-label="Your profile">
            <Avatar username={user.username} src={user.profilePictureURL} size="sm" />
          </Link>
        ) : (
          <Link className="button button--ghost button--small" to="/login">
            Sign in
          </Link>
        )}
      </header>

      <main id="main" className="main" ref={mainRef}>
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Mobile navigation">
        <NavLink to="/" end className={linkClass}>
          <Home size={20} aria-hidden="true" />
          <span>Home</span>
        </NavLink>
        <NavLink to="/explore" className={linkClass}>
          <Compass size={20} aria-hidden="true" />
          <span>Explore</span>
        </NavLink>
        {user ? (
          <NavLink to="/profile" className={linkClass}>
            <UserRound size={20} aria-hidden="true" />
            <span>Profile</span>
          </NavLink>
        ) : (
          <NavLink to="/login" className={linkClass}>
            <LogIn size={20} aria-hidden="true" />
            <span>Sign in</span>
          </NavLink>
        )}
      </nav>
    </div>
  )
}
