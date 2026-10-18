import { describe, expect, it } from 'vitest'
import { AUDIO_IDS } from './lib/search.js'
import { INDEX, SHOWS } from './test/realCatalog.js'

// Guards the generated catalogue (public/data) against malformed sync output.
describe('real catalogue data', () => {
  it('has unique ids and slugs, and an index entry per show file', () => {
    expect(INDEX.shows.length).toBeGreaterThan(0)
    expect(new Set(INDEX.shows.map((s) => s.id)).size).toBe(INDEX.shows.length)
    expect(new Set(INDEX.shows.map((s) => s.slug)).size).toBe(INDEX.shows.length)
    expect(SHOWS.map((s) => s.id)).toEqual(INDEX.shows.map((s) => s.id))
  })

  it('gives every version a playlist and well-formed, sequential episodes', () => {
    for (const show of SHOWS) {
      expect(show.versions.length, show.title).toBeGreaterThan(0)
      expect(new Set(show.versions.map((v) => v.key)).size, show.title).toBe(show.versions.length)
      for (const version of show.versions) {
        expect(version.playlistId, show.title).toMatch(/^PL[\w-]+$/)
        expect(version.channelUrl).toMatch(/^https:\/\/www\.youtube\.com\/@/)
        expect(version.episodes.length, show.title).toBeGreaterThan(0)
        version.episodes.forEach((ep, i) => {
          expect(ep.n).toBe(i + 1)
          expect(ep.videoId, `${show.title} #${ep.n}`).toMatch(/^[\w-]{11}$/)
        })
      }
    }
  })

  it('keeps index summaries consistent with show files', () => {
    for (const show of SHOWS) {
      const entry = INDEX.shows.find((s) => s.id === show.id)
      expect(entry.cover).toBe(show.versions[0].episodes[0].videoId)
      expect(entry.episodeCount).toBe(Math.max(...show.versions.map((v) => v.episodes.length)))
      expect(entry.audio.sort()).toEqual([...new Set(show.versions.map((v) => v.audio))].sort())
    }
  })

  it('only uses offered genres and known audio codes', () => {
    const offered = new Set(INDEX.genres.map((g) => g.id))
    for (const show of INDEX.shows) {
      show.genres.forEach((g) => expect(offered.has(g), `${show.title}: ${g}`).toBe(true))
      show.audio.forEach((a) => expect(AUDIO_IDS).toContain(a))
    }
  })
})
