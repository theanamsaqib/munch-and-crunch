import { Link } from 'react-router'
import { thumbnail } from '../lib/youtube.js'

export function episodeLabel(episode) {
  return episode.title || `Episode ${episode.n}`
}

// `?v=` is omitted for a show's default (first) version to keep URLs short.
export function watchPath(show, version, n) {
  const query = version.key === show.versions[0].key ? '' : `?v=${version.key}`
  return `/watch/${show.id}/${n}${query}`
}

export default function EpisodeList({ show, version, currentN = null, compact = false }) {
  return (
    <ol className={`episode-list${compact ? ' compact' : ''}`}>
      {version.episodes.map((ep) => (
        <li key={ep.videoId}>
          <Link
            to={watchPath(show, version, ep.n)}
            className="episode"
            aria-current={ep.n === currentN ? 'true' : undefined}
          >
            <span className="episode-thumb">
              <img src={thumbnail(ep.videoId)} alt="" loading="lazy" />
              {ep.duration && <span className="duration">{ep.duration}</span>}
            </span>
            <span className="episode-text">
              <span className="episode-number">{ep.n}</span>
              <span className="episode-title">{episodeLabel(ep)}</span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  )
}

export function VersionPicker({ show, version, linkFor }) {
  if (show.versions.length < 2) return null
  return (
    <nav className="version-picker" aria-label="Versions">
      {show.versions.map((v) => (
        <Link key={v.key} to={linkFor(v)} className="chip" aria-current={v.key === version.key ? 'true' : undefined} replace>
          {v.label} <span className="muted">({v.episodes.length})</span>
        </Link>
      ))}
    </nav>
  )
}

export function pickVersion(show, key) {
  return show.versions.find((v) => v.key === key) ?? show.versions[0]
}
