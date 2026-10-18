import { AUDIO_IDS, DEFAULT_FILTERS, SORTS, TYPES } from './search.js'

// The URL is the single source of truth for search state, so deep links,
// refresh and back/forward all restore the same view.
export function parseSearchParams(searchParams, genreIds = null) {
  const type = searchParams.get('type')
  const audio = searchParams.get('audio')
  const sort = searchParams.get('sort')
  const known = genreIds && new Set(genreIds)
  return {
    q: (searchParams.get('q') ?? '').trim(),
    genres: [...new Set(searchParams.getAll('genre'))].filter((g) => !known || known.has(g)),
    type: TYPES.includes(type) ? type : DEFAULT_FILTERS.type,
    audio: AUDIO_IDS.includes(audio) ? audio : DEFAULT_FILTERS.audio,
    sort: SORTS.includes(sort) ? sort : DEFAULT_FILTERS.sort,
  }
}

export function toSearchParams({ q = '', genres = [], type = 'all', audio = 'all', sort = 'relevance' }) {
  const params = new URLSearchParams()
  if (q.trim()) params.set('q', q.trim())
  genres.forEach((g) => params.append('genre', g))
  if (type !== DEFAULT_FILTERS.type) params.set('type', type)
  if (audio !== DEFAULT_FILTERS.audio) params.set('audio', audio)
  if (sort !== DEFAULT_FILTERS.sort) params.set('sort', sort)
  return params
}
