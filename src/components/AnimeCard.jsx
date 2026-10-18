import { Link } from 'react-router'
import { thumbnail } from '../lib/youtube.js'
import Poster from './Poster.jsx'

export const AUDIO_BADGES = { sub: 'Sub', dub: 'Dub', hi: 'Hindi', ta: 'Tamil', te: 'Telugu' }

export function titlePath(item) {
  return `/series/${item.id}/${item.slug}`
}

// Real shows use their official YouTube thumbnail; fixture titles get generated art.
export function CoverArt({ item, size = 'card' }) {
  const videoId = item.cover
  if (!videoId) return <Poster item={item} />
  return size === 'hero' ? (
    <img className="cover" src={thumbnail(videoId, 'maxresdefault')} alt="" />
  ) : (
    <img
      className="cover"
      src={thumbnail(videoId)}
      srcSet={`${thumbnail(videoId)} 320w, ${thumbnail(videoId, 'maxresdefault')} 1280w`}
      sizes="(max-width: 640px) 50vw, 300px"
      alt=""
      loading="lazy"
    />
  )
}

export default function AnimeCard({ item }) {
  const kind = item.type === 'movie' ? 'Movie' : `${item.episodeCount} episodes`
  return (
    <article className="card">
      <Link to={titlePath(item)} className="card-link">
        <div className="card-art">
          <CoverArt item={item} />
          <p className="card-hover" aria-hidden="true">{item.synopsis}</p>
        </div>
        <h3 className="card-title">{item.title}</h3>
      </Link>
      <p className="card-meta">
        {kind} · {item.year}
      </p>
      <ul className="badges" aria-label="Audio">
        {item.audio.map((a) => (
          <li key={a} className={`badge badge-${a}`}>{AUDIO_BADGES[a] ?? a}</li>
        ))}
        {item.limitedTime && <li className="badge badge-limited">Limited time</li>}
      </ul>
    </article>
  )
}

export function CardSkeleton() {
  return (
    <div className="card skeleton" data-testid="card-skeleton">
      <div className="card-art" />
      <div className="skeleton-line" />
      <div className="skeleton-line short" />
    </div>
  )
}
