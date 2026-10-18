import { useCallback, useEffect, useState } from 'react'
import { useCatalog } from '../api/CatalogContext.jsx'

// Runs `fetcher(api, { signal })` whenever `key` changes. Responses from
// superseded requests are dropped, so out-of-order replies can't win.
function useAsync(fetcher, key) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null })
  const [attempt, setAttempt] = useState(0)
  const { api } = useCatalog()

  useEffect(() => {
    const controller = new AbortController()
    let current = true
    setState((s) => ({ ...s, status: 'loading', error: null }))
    fetcher(api, { signal: controller.signal }).then(
      (data) => current && setState({ status: 'success', data, error: null }),
      (error) => current && error?.name !== 'AbortError' && setState({ status: 'error', data: null, error }),
    )
    return () => {
      current = false
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures fetcher's inputs
  }, [api, key, attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  return { ...state, retry }
}

export function useSearch(params) {
  const key = JSON.stringify(params)
  const { data, ...rest } = useAsync((api, opts) => api.search(JSON.parse(key), opts), key)
  return { ...rest, results: data?.results ?? [], total: data?.total ?? 0 }
}

const NO_GENRES = []

export function useGenres() {
  const { data } = useAsync((api) => api.genres(), 'genres')
  return data ?? NO_GENRES
}

export function useTitle(id) {
  const { data, ...rest } = useAsync((api, opts) => api.getTitle(id, opts), id)
  return { ...rest, title: data }
}
