import { Link, NavLink } from 'react-router'

export default function Header() {
  return (
    <header className="site-header">
      <Link to="/" className="logo" aria-label="munch & crunch home">
        <span className="logo-mark" aria-hidden="true">m</span>
        <span>munch <em>&amp;</em> crunch</span>
      </Link>
      <nav aria-label="Main">
        <NavLink to="/search?sort=popular">Browse</NavLink>
      </nav>
      <Link to="/search" state={{ focusSearch: true }} className="icon-button" aria-label="Search">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" />
        </svg>
      </Link>
    </header>
  )
}
