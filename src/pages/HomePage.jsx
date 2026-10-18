import { Link } from 'react-router'
import ResultsGrid from '../components/ResultsGrid.jsx'
import { useSearch } from '../hooks/useCatalogQuery.js'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'

const POPULAR = { sort: 'popular' }
const NEWEST = { sort: 'newest' }

function Row({ title, params, to }) {
  const { status, results } = useSearch(params)
  return (
    <section className="row" aria-label={title}>
      <div className="results-header">
        <h2>{title}</h2>
        <Link to={to}>See all</Link>
      </div>
      <ResultsGrid items={results.slice(0, 6)} loading={status === 'loading'} skeletonCount={6} />
    </section>
  )
}

export default function HomePage() {
  useDocumentTitle(null)
  return (
    <main className="page">
      <section className="hero">
        <h1>Find your next binge.</h1>
        <p>Full episodes of real anime, streamed free from official YouTube channels.</p>
        <Link to="/search" state={{ focusSearch: true }} className="button">Start searching</Link>
      </section>
      <Row title="Popular now" params={POPULAR} to="/search?sort=popular" />
      <Row title="Freshly added" params={NEWEST} to="/search?sort=newest" />
    </main>
  )
}
