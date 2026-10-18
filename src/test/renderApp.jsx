import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { vi } from 'vitest'
import { createCatalogApi } from '../api/catalogApi.js'
import { CatalogProvider } from '../api/CatalogContext.jsx'
import { routes } from '../routes.jsx'
import { CATALOG as FIXTURE } from './fixtures/catalog.js'

export function spyApi(items = FIXTURE) {
  const base = createCatalogApi({ items, latency: 0 })
  return { search: vi.fn(base.search), getTitle: vi.fn(base.getTitle), genres: base.genres }
}

// Each search() call stays pending until the test resolves or rejects it.
export function controllableApi() {
  const base = createCatalogApi({ items: FIXTURE, latency: 0 })
  const calls = []
  const search = vi.fn(
    (params) =>
      new Promise((resolve, reject) => {
        calls.push({ params, resolve: async () => resolve(await base.search(params)), reject })
      }),
  )
  return { search, getTitle: base.getTitle, genres: base.genres, calls }
}

// Uses the fictional fixture by default; pass `items` to test against real data.
export function renderApp(
  initialEntry = '/',
  { items = FIXTURE, api = spyApi(items), debounceMs = 100 } = {},
) {
  const router = createMemoryRouter(routes, { initialEntries: [initialEntry] })
  const user = userEvent.setup()
  render(
    <CatalogProvider api={api} debounceMs={debounceMs}>
      <RouterProvider router={router} />
    </CatalogProvider>,
  )
  return { router, user, api }
}

export function cardTitles() {
  return screen.queryAllByRole('article').map((card) => within(card).getByRole('heading', { level: 3 }).textContent)
}

export function searchInput() {
  return screen.getByRole('searchbox', { name: 'Search titles' })
}

// Genre chips load asynchronously with the catalogue.
export const genreButton = (name) => screen.findByRole('button', { name })

// Wrapped in act because debounce timers fire state updates while we wait.
export const pause = (ms) => act(() => new Promise((resolve) => setTimeout(resolve, ms)))
