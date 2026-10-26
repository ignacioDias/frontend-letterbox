import { Link } from 'react-router-dom'

export function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link className="logo" to={to} aria-label="Letterbox home">
      <span className="logo__mark" aria-hidden="true">
        <span />
      </span>
      <span className="logo__type">
        Letterbox
        <small>A cinema journal</small>
      </span>
    </Link>
  )
}
