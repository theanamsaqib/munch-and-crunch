import { AUDIO_OPTIONS, hasActiveFilters } from '../lib/search.js'

export default function FilterPanel({ genres, filters, onChange, onClear }) {
  const toggleGenre = (id) =>
    onChange({
      genres: filters.genres.includes(id) ? filters.genres.filter((g) => g !== id) : [...filters.genres, id],
    })

  return (
    <section className="filters" aria-label="Filters">
      <div className="filter-row" role="group" aria-label="Genres">
        {genres.map((g) => (
          <button
            key={g.id}
            type="button"
            className="chip"
            aria-pressed={filters.genres.includes(g.id)}
            onClick={() => toggleGenre(g.id)}
          >
            {g.label}
          </button>
        ))}
      </div>
      <div className="filter-row controls">
        <label>
          Type
          <select value={filters.type} onChange={(e) => onChange({ type: e.target.value })}>
            <option value="all">All</option>
            <option value="series">Series</option>
            <option value="movie">Movies</option>
          </select>
        </label>
        <label>
          Sort by
          <select value={filters.sort} onChange={(e) => onChange({ sort: e.target.value })}>
            <option value="relevance">Best match</option>
            <option value="popular">Most popular</option>
            <option value="newest">Newest</option>
            <option value="az">A–Z</option>
          </select>
        </label>
        <label>
          Language
          <select value={filters.audio} onChange={(e) => onChange({ audio: e.target.value })}>
            {AUDIO_OPTIONS.map((a) => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </select>
        </label>
        {hasActiveFilters(filters) && (
          <button type="button" className="link-button" onClick={onClear}>
            Clear filters
          </button>
        )}
      </div>
    </section>
  )
}
