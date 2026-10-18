// Minimal YouTube Data API v3 client (https://developers.google.com/youtube/v3).
// Every list call costs 1 quota unit; the free daily quota is 10,000 units.
const API = 'https://www.googleapis.com/youtube/v3'

export function createYouTube(apiKey) {
  let unitsUsed = 0

  async function call(resource, params, attempt = 1) {
    const url = new URL(`${API}/${resource}`)
    for (const [k, v] of Object.entries({ ...params, key: apiKey })) url.searchParams.set(k, v)
    let res
    try {
      // A stalled connection would otherwise hang the whole sync forever.
      res = await fetch(url, { signal: AbortSignal.timeout(30_000) })
    } catch (err) {
      if (attempt >= 4) throw new Error(`YouTube API ${resource} failed after ${attempt} tries: ${err.message}`)
      await new Promise((r) => setTimeout(r, 2000 * attempt))
      return call(resource, params, attempt + 1)
    }
    unitsUsed++
    if (res.status >= 500 && attempt < 4) {
      await new Promise((r) => setTimeout(r, 2000 * attempt))
      return call(resource, params, attempt + 1)
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      const reason = body.error?.errors?.[0]?.reason ?? res.status
      const error = new Error(`YouTube API ${resource} failed: ${reason}`)
      error.quotaExceeded = reason === 'quotaExceeded' || reason === 'dailyLimitExceeded'
      error.notFound = reason === 'playlistNotFound'
      throw error
    }
    return res.json()
  }

  // Some playlists (e.g. Toei's "Precure") keep returning an empty last page with the
  // same nextPageToken forever, so stop on an empty page or a repeated token.
  // 200 pages = 10,000 items, far above any real playlist, as a final backstop.
  async function paginate(resource, params, maxPages = 200) {
    const items = []
    const seen = new Set()
    let pageToken
    for (let pages = 1; pages <= maxPages; pages++) {
      const page = await call(resource, { ...params, maxResults: 50, ...(pageToken && { pageToken }) })
      const pageItems = page.items ?? []
      items.push(...pageItems)
      pageToken = page.nextPageToken
      if (!pageToken || pageItems.length === 0 || seen.has(pageToken)) return items
      seen.add(pageToken)
    }
    throw new Error(`YouTube API ${resource}: more than ${maxPages} pages, stopping`)
  }

  return {
    get unitsUsed() {
      return unitsUsed
    },
    playlists: (channelId) => paginate('playlists', { part: 'snippet,contentDetails', channelId }),
    playlistItems: (playlistId) => paginate('playlistItems', { part: 'snippet,contentDetails', playlistId }),
    // YouTube keeps an auto-generated "UUMO…" playlist of each channel's members-only videos.
    // The videos API reports those as public, but they won't play for non-members.
    async membersOnlyIds(channelId) {
      try {
        const items = await paginate('playlistItems', { part: 'contentDetails', playlistId: `UUMO${channelId.slice(2)}` })
        return items.map((i) => i.contentDetails.videoId)
      } catch (err) {
        if (err.notFound) return []
        throw err
      }
    },
    async videos(ids) {
      const out = []
      for (let i = 0; i < ids.length; i += 50) {
        const page = await call('videos', { part: 'contentDetails,status', id: ids.slice(i, i + 50).join(',') })
        out.push(...(page.items ?? []))
      }
      return out
    },
  }
}
