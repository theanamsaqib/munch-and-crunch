import { Link, Outlet, ScrollRestoration } from 'react-router'
import Header from './components/Header.jsx'
import HomePage from './pages/HomePage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import PrivacyPage from './pages/PrivacyPage.jsx'
import SearchPage from './pages/SearchPage.jsx'
import SeriesPage from './pages/SeriesPage.jsx'
import WatchPage from './pages/WatchPage.jsx'

function Layout() {
  return (
    <>
      <Header />
      <Outlet />
      <footer className="site-footer">
        Episodes are embedded from the official YouTube channels of their licensors. Show details from{' '}
        <a href="https://anilist.co" target="_blank" rel="noreferrer">AniList</a>. munch &amp; crunch hosts no video.
        {' '}<Link to="/privacy">Privacy</Link>
      </footer>
      <ScrollRestoration />
    </>
  )
}

export const routes = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'series/:id/:slug?', element: <SeriesPage /> },
      { path: 'watch/:id/:n', element: <WatchPage /> },
      { path: 'privacy', element: <PrivacyPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
