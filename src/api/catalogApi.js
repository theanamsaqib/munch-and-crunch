import { genresOf, searchCatalog } from '../lib/search.js'

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true },
    )
  })
}

// In-memory catalogue (tests, fixtures). Same { search, getTitle, genres } shape as the remote one.
export function createCatalogApi({ items, latency = 0 }) {
  return {
    async search(params, { signal } = {}) {
      await wait(latency, signal)
      const results = searchCatalog(items, params)
      return { results, total: results.length }
    },
    async getTitle(id, { signal } = {}) {
      await wait(latency / 2, signal)
      return items.find((item) => item.id === id) ?? null
    },
    async genres() {
      return genresOf(items)
    },
  }
}

// Static JSON written by `npm run sync`: one search index plus one file per show,
// so the page only downloads episode lists for shows that are opened.
export function createRemoteCatalogApi({ baseUrl = '/data' } = {}) {
  let index = null
  const loadIndex = () => {
    index ??= fetch(`${baseUrl}/catalog.json`).then((res) => {
      if (!res.ok) throw new Error(`catalog.json: ${res.status}`)
      return res.json()
    })
    index.catch(() => (index = null))
    return index
  }

  return {
    async search(params) {
      const { shows } = await loadIndex()
      const results = searchCatalog(shows, params)
      return { results, total: results.length }
    },
    async getTitle(id, { signal } = {}) {
      const { shows } = await loadIndex()
      if (!shows.some((s) => s.id === id)) return null
      const res = await fetch(`${baseUrl}/shows/${encodeURIComponent(id)}.json`, { signal })
      if (!res.ok) throw new Error(`show ${id}: ${res.status}`)
      return res.json()
    },
    async genres() {
      return (await loadIndex()).genres
    },
  }
}
