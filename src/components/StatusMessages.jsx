export function NoResults({ query, filtersActive, onClearFilters }) {
  return (
    <div className="message" role="region" aria-label="No results">
      <h2>{query ? `No results for “${query}”` : 'Nothing matches these filters'}</h2>
      {filtersActive ? (
        <>
          <p>Your filters may be too narrow.</p>
          <button type="button" className="button" onClick={onClearFilters}>Clear filters</button>
        </>
      ) : (
        <ul>
          <li>Check the spelling</li>
          <li>Try a shorter or more general word</li>
          <li>Search by a single word from the title</li>
        </ul>
      )}
    </div>
  )
}

export function ErrorState({ onRetry }) {
  return (
    <div className="message" role="alert">
      <h2>Something went wrong loading titles.</h2>
      <button type="button" className="button" onClick={onRetry}>Retry</button>
    </div>
  )
}
