import { forwardRef } from 'react'

const SearchBar = forwardRef(function SearchBar({ value, onChange, onSubmit, onClear }, ref) {
  return (
    <form
      role="search"
      className="search-bar"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <label htmlFor="search-input" className="visually-hidden">Search titles</label>
      <svg className="search-icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" />
      </svg>
      <input
        ref={ref}
        id="search-input"
        type="search"
        autoComplete="off"
        placeholder="Search by title…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus
      />
      {value && (
        <button type="button" className="clear-button" aria-label="Clear search" onClick={onClear}>
          ×
        </button>
      )}
    </form>
  )
})

export default SearchBar
