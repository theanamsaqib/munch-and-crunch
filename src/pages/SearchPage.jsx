import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { useCatalog } from '../api/CatalogContext.jsx'
import FilterPanel from '../components/FilterPanel.jsx'
import ResultsGrid from '../components/ResultsGrid.jsx'
import SearchBar from '../components/SearchBar.jsx'
import { ErrorState, NoResults } from '../components/StatusMessages.jsx'
import { useGenres, useSearch } from '../hooks/useCatalogQuery.js'
import { useDebouncedValue } from '../hooks/useDebouncedValue.js'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import { DEFAULT_FILTERS, hasActiveFilters } from '../lib/search.js'
import { parseSearchParams, toSearchParams } from '../lib/urlState.js'

const PAGE_SIZE = 48

export default function SearchPage() {
  const { debounceMs } = useCatalog()
  const genres = useGenres()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  // Unknown genres are dropped once the genre list has loaded.
  const params = useMemo(
    () => parseSearchParams(searchParams, genres.length ? genres.map((g) => g.id) : null),
    [searchParams, genres],
  )
  const inputRef = useRef(null)

  // `input` is what the user is typing; the URL holds the committed query.
  const [input, setInput] = useState(params.q)
  const debouncedInput = useDebouncedValue(input, debounceMs)

  const update = useCallback(
    (patch, options) => setSearchParams(toSearchParams({ ...params, ...patch }), options),
    [params, setSearchParams],
  )

  // URL -> input, for back/forward and deep links. Ignores trailing-space differences.
  useEffect(() => {
    setInput((current) => (current.trim() === params.q ? current : params.q))
  }, [params.q])

  // Debounced input -> URL. Replace so each keystroke doesn't add a history entry.
  useEffect(() => {
    if (debouncedInput.trim() !== params.q) update({ q: debouncedInput }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to new debounced input
  }, [debouncedInput])

  useEffect(() => {
    if (location.state?.focusSearch) inputRef.current?.focus()
  }, [location.key, location.state])

  const { status, results, total, retry } = useSearch(params)
  // Render results in pages; a catalogue of hundreds of cards is slow to draw at once.
  const [limit, setLimit] = useState(PAGE_SIZE)
  const paramsKey = JSON.stringify(params)
  useEffect(() => setLimit(PAGE_SIZE), [paramsKey])
  const filtersActive = hasActiveFilters(params)
  const clearFilters = () => update({ ...DEFAULT_FILTERS, sort: params.sort })

  let heading = 'Popular on munch & crunch'
  if (params.q) heading = `Results for “${params.q}”`
  else if (filtersActive) heading = 'Browse'
  useDocumentTitle(params.q ? `“${params.q}”` : 'Search')

  return (
    <main className="page search-page">
      <SearchBar
        ref={inputRef}
        value={input}
        onChange={setInput}
        onSubmit={() => update({ q: input })}
        onClear={() => {
          setInput('')
          update({ q: '' })
          inputRef.current?.focus()
        }}
      />
      <FilterPanel genres={genres} filters={params} onChange={(patch) => update(patch)} onClear={clearFilters} />

      <section aria-labelledby="results-heading" className="results">
        <div className="results-header">
          <h2 id="results-heading">{heading}</h2>
          <p role="status" className="result-count">
            {status === 'success' ? `${total} ${total === 1 ? 'result' : 'results'}` : ''}
          </p>
        </div>

        {status === 'error' && <ErrorState onRetry={retry} />}
        {status === 'success' && total === 0 && (
          <NoResults query={params.q} filtersActive={filtersActive} onClearFilters={clearFilters} />
        )}
        {(status === 'loading' || total > 0) && (
          <ResultsGrid items={results.slice(0, limit)} loading={status === 'loading'} />
        )}
        {status === 'success' && total > limit && (
          <div className="show-more">
            <button type="button" className="button secondary" onClick={() => setLimit((n) => n + PAGE_SIZE)}>
              Show more ({total - limit} left)
            </button>
          </div>
        )}
      </section>
    </main>
  )
}
