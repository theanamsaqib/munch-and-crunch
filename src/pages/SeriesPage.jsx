import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import { CoverArt } from '../components/AnimeCard.jsx'
import EpisodeList, { pickVersion, VersionPicker, watchPath } from '../components/EpisodeList.jsx'
import { ErrorState } from '../components/StatusMessages.jsx'
import { useTitle } from '../hooks/useCatalogQuery.js'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import { genreLabel } from '../lib/search.js'
import NotFoundPage from './NotFoundPage.jsx'

export default function SeriesPage() {
  const { id, slug } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { status, title: show, retry } = useTitle(id)
  useDocumentTitle(show?.title)

  if (status === 'loading') {
    return <main className="page" aria-busy="true"><div className="detail skeleton" /></main>
  }
  if (status === 'error') return <main className="page"><ErrorState onRetry={retry} /></main>
  if (!show) return <NotFoundPage message="We couldn’t find that title." />
  if (slug !== show.slug) return <Navigate to={`/series/${show.id}/${show.slug}`} replace />

  const version = show.versions?.length ? pickVersion(show, searchParams.get('v')) : null
  const seriesLink = (v) => `/series/${show.id}/${show.slug}${v.key === show.versions[0].key ? '' : `?v=${v.key}`}`

  return (
    <main className="page">
      <button type="button" className="link-button back" onClick={() => navigate(-1)}>
        ← Back
      </button>
      <article className="detail">
        <div className="detail-art"><CoverArt item={show} size="hero" /></div>
        <div className="detail-body">
          <h1>{show.title}</h1>
          <p className="detail-meta">
            {show.type === 'movie' ? 'Movie' : `Series · ${show.episodeCount} episodes`} · {show.year}
          </p>
          {show.synopsis.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
          <ul className="genre-links" aria-label="Genres">
            {show.genres.map((g) => (
              <li key={g}><Link to={`/search?genre=${g}`} className="chip">{genreLabel(g)}</Link></li>
            ))}
          </ul>
          {version && (
            <>
              <Link to={watchPath(show, version, 1)} className="button">▶ Start watching</Link>
              <p className="source-note">
                Free, official upload by{' '}
                <a href={version.channelUrl} target="_blank" rel="noreferrer">{version.channel}</a> on YouTube.
                {version.limitedTime && ' Marked “limited time” by the channel, so it may be removed.'}
                {' '}Availability depends on your region.
                {show.anilistUrl && (
                  <>
                    {' '}Details from <a href={show.anilistUrl} target="_blank" rel="noreferrer">AniList</a>
                    {show.synopsisSource && <>; description by {show.synopsisSource}</>}.
                  </>
                )}
              </p>
            </>
          )}
        </div>
      </article>

      {version && (
        <section className="episodes" aria-labelledby="episodes-heading">
          <h2 id="episodes-heading">Episodes</h2>
          <VersionPicker show={show} version={version} linkFor={seriesLink} />
          <EpisodeList show={show} version={version} />
        </section>
      )}
    </main>
  )
}
