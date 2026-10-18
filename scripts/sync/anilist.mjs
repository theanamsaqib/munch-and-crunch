// AniList GraphQL lookups (https://docs.anilist.co). Free, no key; rate limited,
// so calls are spaced out and results cached on disk between runs.
import fs from 'node:fs'
import { bestTitleMatch, searchVariants } from './classify.mjs'

const QUERY = `query ($search: String) {
  Page(perPage: 5) {
    media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
      id title { romaji english } synonyms genres seasonYear format popularity isAdult siteUrl
      description(asHtml: false)
    }
  }
}`

const MIN_GAP_MS = 2200
const MIN_SIMILARITY = 0.6

// Best title match; ties go to the more popular entry, so "JoJo's Bizarre Adventure"
// resolves to the 2012 TV series rather than the 1993 OVA that shares its name.
export function pickMatch(title, candidates) {
  const scored = candidates
    .filter((m) => !m.isAdult)
    .map((m) => ({ m, score: bestTitleMatch(title, m) }))
    .sort((a, b) => b.score - a.score || (b.m.popularity ?? 0) - (a.m.popularity ?? 0))
  return scored[0]?.score >= MIN_SIMILARITY ? scored[0].m : null
}

export function createAniList(cacheFile) {
  const cache = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : {}
  let last = 0

  async function search(term, attempt = 1) {
    const wait = last + MIN_GAP_MS - Date.now()
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    last = Date.now()
    let res
    try {
      res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query: QUERY, variables: { search: term } }),
        signal: AbortSignal.timeout(30_000),
      })
    } catch (err) {
      if (attempt >= 4) throw new Error(`AniList failed after ${attempt} tries: ${err.message}`)
      await new Promise((r) => setTimeout(r, 3000 * attempt))
      return search(term, attempt + 1)
    }
    if (res.status === 429) {
      const retry = Number(res.headers.get('retry-after') ?? 60)
      await new Promise((r) => setTimeout(r, retry * 1000))
      return search(term)
    }
    if (!res.ok) throw new Error(`AniList ${res.status}`)
    return (await res.json()).data?.Page?.media ?? []
  }

  return {
    // Best confident match for a cleaned series title, or null. Tries season-normalised
    // variants ("Mob Psycho 100 S3" -> "Mob Psycho 100 Season 3") until one matches.
    async match(title) {
      for (const term of searchVariants(title)) {
        if (!(term in cache)) {
          cache[term] = await search(term)
          fs.writeFileSync(cacheFile, JSON.stringify(cache))
        }
        // Older cache files stored the chosen entry rather than all candidates.
        const candidates = Array.isArray(cache[term]) ? cache[term] : [cache[term]].filter(Boolean)
        const pick = pickMatch(term, candidates)
        if (pick) return pick
      }
      return null
    },
  }
}
