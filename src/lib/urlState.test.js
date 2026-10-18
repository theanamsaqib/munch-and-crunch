import { describe, expect, it } from 'vitest'
import { parseSearchParams, toSearchParams } from './urlState.js'

describe('urlState', () => {
  it('parses a full query string', () => {
    const params = parseSearchParams(new URLSearchParams('q=ninja&genre=action&genre=comedy&type=movie&audio=hi&sort=az'))
    expect(params).toEqual({ q: 'ninja', genres: ['action', 'comedy'], type: 'movie', audio: 'hi', sort: 'az' })
  })

  it('falls back to defaults for missing or invalid values', () => {
    const params = parseSearchParams(
      new URLSearchParams('q=%20%20&genre=bogus&genre=drama&genre=drama&type=tv&audio=klingon&sort=random'),
      ['action', 'drama'],
    )
    expect(params).toEqual({ q: '', genres: ['drama'], type: 'all', audio: 'all', sort: 'relevance' })
  })

  it('omits defaults and round-trips', () => {
    expect(toSearchParams({ q: '  ', genres: [], type: 'all', audio: 'all', sort: 'relevance' }).toString()).toBe('')
    const qs = 'q=tide&genre=fantasy&type=series&audio=dub&sort=newest'
    expect(toSearchParams(parseSearchParams(new URLSearchParams(qs))).toString()).toBe(qs)
  })
})
