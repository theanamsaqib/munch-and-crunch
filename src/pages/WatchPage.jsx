import { Link, useParams, useSearchParams } from 'react-router'
import { titlePath } from '../components/AnimeCard.jsx'
import EpisodeList, { episodeLabel, pickVersion, VersionPicker, watchPath } from '../components/EpisodeList.jsx'
import { ErrorState } from '../components/StatusMessages.jsx'
import { useTitle } from '../hooks/useCatalogQuery.js'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import { embedUrl, watchOnYouTube } from '../lib/youtube.js'
import NotFoundPage from './NotFoundPage.jsx'

export default function WatchPage() {
  const { id, n } = useParams()
  const [searchParams] = useSearchParams()
  const { status, title: show, retry } = useTitle(id)
  useDocumentTitle(show ? `Episode ${n} · ${show.title}` : null)

  if (status === 'loading') {
    return <main className="page" aria-busy="true"><div className="player skeleton" /></main>
  }
  if (status === 'error') return <main className="page"><ErrorState onRetry={retry} /></main>

  const version = show?.versions?.length ? pickVersion(show, searchParams.get('v')) : null
  const index = Number(n) - 1
  const episode = version?.episodes[index]
  if (!episode) return <NotFoundPage message="We couldn’t find that episode." />

  const prev = version.episodes[index - 1]
  const next = version.episodes[index + 1]
  const label = episodeLabel(episode)
  // Switching version keeps the episode number when the other version has it.
  const versionLink = (v) => watchPath(show, v, Math.min(episode.n, v.episodes.length))

  return (
    <main className="page watch">
      <div className="watch-main">
        <div className="player">
          <iframe
            key={episode.videoId}
            src={embedUrl(episode.videoId)}
            title={`${show.title}: ${label}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
        <p className="eyebrow"><Link to={titlePath(show)}>{show.title}</Link></p>
        <h1>{label}</h1>
        <VersionPicker show={show} version={version} linkFor={versionLink} />

        <nav className="episode-nav" aria-label="Episode navigation">
          {prev ? <Link to={watchPath(show, version, prev.n)} className="button secondary">← Previous</Link> : <span />}
          {next && <Link to={watchPath(show, version, next.n)} className="button">Next episode →</Link>}
        </nav>

        <p className="source-note">
          Streaming free from{' '}
          <a href={version.channelUrl} target="_blank" rel="noreferrer">{version.channel}</a>’s official YouTube channel.
          Not playing in your region?{' '}
          <a href={watchOnYouTube(episode.videoId, version.playlistId)} target="_blank" rel="noreferrer">
            Open it on YouTube
          </a>.
        </p>
      </div>

      <aside className="watch-sidebar" aria-label="Episodes">
        <h2>Episodes</h2>
        <EpisodeList show={show} version={version} currentN={episode.n} compact />
      </aside>
    </main>
  )
}
