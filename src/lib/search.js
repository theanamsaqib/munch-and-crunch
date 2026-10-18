const GENRE_LABELS = { 'sci-fi': 'Sci-Fi', 'slice-of-life': 'Slice of Life' }

export function genreLabel(id) {
  return GENRE_LABELS[id] ?? id.charAt(0).toUpperCase() + id.slice(1)
}

// Only offer genres that actually appear in the catalogue, alphabetically.
export function genresOf(items) {
  return [...new Set(items.flatMap((item) => item.genres))].sort().map((id) => ({ id, label: genreLabel(id) }))
}

export const TYPES = ['all', 'series', 'movie']
export const SORTS = ['relevance', 'popular', 'newest', 'az']

export const AUDIO_OPTIONS = [
  { id: 'all', label: 'Any' },
  { id: 'sub', label: 'English subtitles' },
  { id: 'dub', label: 'English dub' },
  { id: 'hi', label: 'Hindi dub' },
  { id: 'ta', label: 'Tamil dub' },
  { id: 'te', label: 'Telugu dub' },
]
export const AUDIO_IDS = AUDIO_OPTIONS.map((a) => a.id)

export const DEFAULT_FILTERS = { genres: [], type: 'all', audio: 'all', sort: 'relevance' }

export function normalize(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

// Lower is better: 0 exact, 1 title prefix, 2 word prefix, 3 substring.
function matchScore(item, query) {
  let best = Infinity
  for (const name of [item.title, ...item.altTitles].map(normalize)) {
    if (name === query) best = Math.min(best, 0)
    else if (name.startsWith(query)) best = Math.min(best, 1)
    else if (name.split(' ').some((word) => word.startsWith(query))) best = Math.min(best, 2)
    else if (name.includes(query)) best = Math.min(best, 3)
  }
  return best
}

const byPopularity = (a, b) => b.popularity - a.popularity

const COMPARATORS = {
  popular: byPopularity,
  newest: (a, b) => b.year - a.year || byPopularity(a, b),
  az: (a, b) => a.title.localeCompare(b.title),
}

export function hasActiveFilters({ genres, type, audio }) {
  return genres.length > 0 || type !== 'all' || audio !== 'all'
}

// Genres within the group are OR'd; separate filter groups are AND'd.
export function searchCatalog(items, params = {}) {
  const { q = '', genres = [], type = 'all', audio = 'all', sort = 'relevance' } = params
  const query = normalize(q)

  const matches = items
    .map((item) => ({ item, score: query ? matchScore(item, query) : 0 }))
    .filter(({ item, score }) =>
      score !== Infinity &&
      (genres.length === 0 || genres.some((g) => item.genres.includes(g))) &&
      (type === 'all' || item.type === type) &&
      (audio === 'all' || item.audio.includes(audio)),
    )

  const compare =
    sort === 'relevance'
      ? (a, b) => a.score - b.score || byPopularity(a.item, b.item)
      : (a, b) => COMPARATORS[sort](a.item, b.item)

  return matches.sort(compare).map(({ item }) => item)
}
