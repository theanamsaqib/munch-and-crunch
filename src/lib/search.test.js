import { describe, expect, it } from 'vitest'
import { CATALOG } from '../test/fixtures/catalog.js'
import { hasActiveFilters, normalize, searchCatalog } from './search.js'

const titles = (items) => items.map((i) => i.title)
const search = (params) => titles(searchCatalog(CATALOG, params))

describe('normalize', () => {
  it('lowercases, strips accents and collapses whitespace (S4)', () => {
    expect(normalize('  Café   KAIJU ')).toBe('cafe kaiju')
  })
})

describe('searchCatalog (U1)', () => {
  it('ranks title prefix > word prefix > substring, ahead of popularity', () => {
    // Snapdragon Sisters is the most popular title but only a substring match.
    expect(search({ q: 'dragon' })).toEqual(['Dragonfly Courier', 'The Dragon Who Hated Rain', 'Snapdragon Sisters'])
  })

  it('ranks an exact match first', () => {
    expect(search({ q: 'tidecaller' })[0]).toBe('Tidecaller')
  })

  it('matches accent-insensitively and on alternate titles (S4)', () => {
    expect(search({ q: 'cafe' })).toEqual(['Café Kaiju'])
    expect(search({ q: 'daidokoro' })).toEqual(['Kitchen Ronin'])
  })

  it('treats whitespace-only queries as empty (E2)', () => {
    expect(search({ q: '   ' })).toHaveLength(CATALOG.length)
  })

  it('returns the whole catalogue by popularity for an empty query (E1)', () => {
    const result = searchCatalog(CATALOG, {})
    expect(result).toHaveLength(CATALOG.length)
    expect(result.map((i) => i.popularity)).toEqual([...CATALOG.map((i) => i.popularity)].sort((a, b) => b - a))
  })

  it('returns nothing for an unmatched query (N1)', () => {
    expect(search({ q: 'zzzz' })).toEqual([])
  })

  it('ORs genres within the genre filter (F2)', () => {
    const result = searchCatalog(CATALOG, { genres: ['music', 'horror'] })
    expect(result).toHaveLength(5)
    result.forEach((i) => expect(i.genres.some((g) => g === 'music' || g === 'horror')).toBe(true))
  })

  it('ANDs separate filter groups (F3)', () => {
    expect(search({ genres: ['fantasy'], type: 'movie', audio: 'dub', sort: 'az' })).toEqual([
      'The Dragon Who Hated Rain',
      'Whisper of the Snow Fox',
    ])
  })

  it('applies filters on top of a query', () => {
    expect(search({ q: 'ninja', type: 'movie' })).toEqual(['Shadow Ninja Requiem'])
  })

  it('sorts A–Z, newest (popularity tie-break) and popular (F4)', () => {
    expect(search({ sort: 'az' })).toEqual([...titles(CATALOG)].sort((a, b) => a.localeCompare(b)))

    const newest = searchCatalog(CATALOG, { sort: 'newest' })
    for (let i = 1; i < newest.length; i++) {
      const [prev, cur] = [newest[i - 1], newest[i]]
      expect(prev.year > cur.year || (prev.year === cur.year && prev.popularity > cur.popularity)).toBe(true)
    }

    expect(search({ q: 'dragon', sort: 'popular' })[0]).toBe('Snapdragon Sisters')
  })
})

describe('hasActiveFilters', () => {
  it('ignores sort and query', () => {
    expect(hasActiveFilters({ genres: [], type: 'all', audio: 'all' })).toBe(false)
    expect(hasActiveFilters({ genres: [], type: 'movie', audio: 'all' })).toBe(true)
    expect(hasActiveFilters({ genres: [], type: 'all', audio: 'hi' })).toBe(true)
  })
})
