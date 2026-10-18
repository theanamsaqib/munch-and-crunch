import { afterEach, describe, expect, it, vi } from 'vitest'
import { createYouTube } from './youtube.mjs'

// Serves `pages` in order, then repeats the last one forever (like YouTube does for some playlists).
function fakeFetch(pages) {
  let i = 0
  return vi.fn(async () => {
    const page = pages[Math.min(i++, pages.length - 1)]
    return { ok: true, status: 200, json: async () => page }
  })
}

const item = (id) => ({ contentDetails: { videoId: id } })

afterEach(() => vi.unstubAllGlobals())

describe('sync: YouTube pagination', () => {
  it('stops when YouTube keeps returning an empty page with the same token', async () => {
    const fetch = fakeFetch([
      { items: [item('a'), item('b')], nextPageToken: 'T1' },
      { items: [item('c')], nextPageToken: 'T2' },
      { items: [], nextPageToken: 'T2' },
    ])
    vi.stubGlobal('fetch', fetch)
    const yt = createYouTube('key')

    const items = await yt.playlistItems('PL1')
    expect(items.map((i) => i.contentDetails.videoId)).toEqual(['a', 'b', 'c'])
    expect(fetch).toHaveBeenCalledTimes(3)
    expect(yt.unitsUsed).toBe(3)
  })

  it('stops when a non-empty page repeats its token', async () => {
    const fetch = fakeFetch([
      { items: [item('a')], nextPageToken: 'T1' },
      { items: [item('b')], nextPageToken: 'T1' },
    ])
    vi.stubGlobal('fetch', fetch)
    expect(await createYouTube('key').playlistItems('PL1')).toHaveLength(2)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('lists members-only videos from the channel UUMO playlist, or none if it does not exist', async () => {
    const fetch = fakeFetch([{ items: [item('m1'), item('m2')] }])
    vi.stubGlobal('fetch', fetch)
    expect(await createYouTube('key').membersOnlyIds('UCabc123')).toEqual(['m1', 'm2'])
    expect(String(fetch.mock.calls[0][0])).toContain('playlistId=UUMOabc123')

    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false, status: 404,
      json: async () => ({ error: { errors: [{ reason: 'playlistNotFound' }] } }),
    })))
    expect(await createYouTube('key').membersOnlyIds('UCabc123')).toEqual([])
  })

  it('follows normal pagination to the end', async () => {
    vi.stubGlobal('fetch', fakeFetch([
      { items: [item('a')], nextPageToken: 'T1' },
      { items: [item('b')], nextPageToken: 'T2' },
      { items: [item('c')] },
    ]))
    expect(await createYouTube('key').playlistItems('PL1')).toHaveLength(3)
  })
})
