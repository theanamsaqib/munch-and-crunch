// Writes the app's static data: public/data/catalog.json (search index, no episodes)
// and public/data/shows/<id>.json (one file per show, with every version's episodes).
import fs from 'node:fs'
import path from 'node:path'
import { AUDIO_LABELS, seasonLabel } from './classify.mjs'

const GENRE_LABELS = { 'sci-fi': 'Sci-Fi', 'slice-of-life': 'Slice of Life', 'mahou-shoujo': 'Magical Girl' }
const genreLabel = (id) => GENRE_LABELS[id] ?? id.charAt(0).toUpperCase() + id.slice(1)
const AUDIO_ORDER = Object.keys(AUDIO_LABELS)

function summary(text, max = 280) {
  const first = text.split('\n\n')[0]
  return first.length <= max ? first : `${first.slice(0, max).replace(/\s+\S*$/, '')}…`
}

export function toIndexEntry(show) {
  const audio = [...new Set(show.versions.map((v) => v.audio))].sort((a, b) => AUDIO_ORDER.indexOf(a) - AUDIO_ORDER.indexOf(b))
  return {
    id: show.id,
    slug: show.slug,
    title: show.title,
    altTitles: show.altTitles,
    type: show.type,
    year: show.year,
    genres: show.genres,
    audio,
    popularity: show.popularity,
    synopsis: summary(show.synopsis),
    cover: show.versions[0].episodes[0].videoId,
    episodeCount: Math.max(...show.versions.map((v) => v.episodes.length)),
    limitedTime: show.versions.every((v) => v.limitedTime),
    channels: [...new Set(show.versions.map((v) => v.channel))],
  }
}

// Several playlists from one channel and language can map to the same show. If one is
// (mostly) contained in the other, e.g. a "Season 3" list beside a "Full Series" list,
// keep the longer. Otherwise they are different seasons, so keep both, labelled.
export function addVersion(show, version, playlistTitle) {
  const same = show.versions.filter((v) => v.channelKey === version.channelKey && v.audio === version.audio)
  const ids = new Set(version.episodes.map((e) => e.videoId))
  for (const v of same) {
    const shared = v.episodes.filter((e) => ids.has(e.videoId)).length
    if (shared / Math.min(ids.size, v.episodes.length) >= 0.8) {
      if (version.episodes.length > v.episodes.length) Object.assign(v, version, { key: v.key, note: v.note })
      return
    }
  }
  if (same.length === 0) {
    show.versions.push(version)
    return
  }
  // A distinct season: give it its own key and a short label taken from the playlist title.
  const note = seasonLabel(playlistTitle, show.title)
  show.versions.push({ ...version, key: `${version.key}-${same.length + 1}`, note: note || `Part ${same.length + 1}` })
}

export function existingShowCount(outDir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(outDir, 'catalog.json'), 'utf8')).shows.length
  } catch {
    return 0
  }
}

// Refuses to replace a catalogue with an empty or much smaller one, which almost
// always means the sync went wrong rather than that shows disappeared.
export function safeToWrite(newCount, oldCount, force = false) {
  if (newCount === 0) return { ok: false, reason: 'No shows were found.' }
  if (!force && newCount < oldCount / 2) {
    return { ok: false, reason: `Only ${newCount} shows found versus ${oldCount} currently; pass --force if that is expected.` }
  }
  return { ok: true }
}

export function writeCatalog(outDir, shows, { channels, generatedAt = new Date().toISOString() }) {
  const showsDir = path.join(outDir, 'shows')
  fs.rmSync(showsDir, { recursive: true, force: true })
  fs.mkdirSync(showsDir, { recursive: true })

  // Two shows can clean to the same slug (e.g. a matched and an unmatched copy); URLs must stay unique.
  const taken = new Set()
  for (const show of [...shows].sort((a, b) => b.popularity - a.popularity)) {
    if (taken.has(show.slug)) show.slug = `${show.slug}-${show.id}`
    taken.add(show.slug)
  }

  const index = shows.map(toIndexEntry).sort((a, b) => b.popularity - a.popularity)
  const genres = [...new Set(index.flatMap((s) => s.genres))].sort().map((id) => ({ id, label: genreLabel(id) }))

  for (const show of shows) {
    const versions = show.versions.map((v) => ({
      ...v,
      label: [v.channel, AUDIO_LABELS[v.audio], v.note].filter(Boolean).join(' · '),
    }))
    fs.writeFileSync(path.join(showsDir, `${show.id}.json`), JSON.stringify({
      ...toIndexEntry(show),
      synopsis: show.synopsis,
      synopsisSource: show.synopsisSource ?? null,
      anilistUrl: show.anilistUrl ?? null,
      versions,
    }))
  }
  fs.writeFileSync(
    path.join(outDir, 'catalog.json'),
    JSON.stringify({ generatedAt, channels, genres, shows: index }),
  )
  return { shows: index.length, episodes: shows.reduce((n, s) => n + s.versions.reduce((m, v) => m + v.episodes.length, 0), 0) }
}
