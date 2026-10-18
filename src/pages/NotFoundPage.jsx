import { Link } from 'react-router'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'

export default function NotFoundPage({ message = 'This page doesn’t exist.' }) {
  useDocumentTitle('Not found')
  return (
    <main className="page message">
      <h1>Not found</h1>
      <p>{message}</p>
      <Link to="/search" className="button">Back to search</Link>
    </main>
  )
}
