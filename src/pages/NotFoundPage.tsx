import { Link } from 'react-router-dom'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export function NotFoundPage() {
  useDocumentTitle('Not found')

  return (
    <div className="page not-found">
      <p className="not-found__code">404</p>
      <h1>That screening has ended.</h1>
      <p>The page you were looking for is not on tonight's programme.</p>
      <div className="not-found__actions">
        <Link className="button button--accent" to="/">
          Return home
        </Link>
        <Link className="button button--ghost" to="/explore">
          Explore films
        </Link>
      </div>
    </div>
  )
}
