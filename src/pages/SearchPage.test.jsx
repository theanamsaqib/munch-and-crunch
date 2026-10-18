import { act, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createCatalogApi } from '../api/catalogApi.js'
import { CATALOG } from '../test/fixtures/catalog.js'
import { cardTitles, controllableApi, genreButton, pause, renderApp, searchInput } from '../test/renderApp.jsx'

const resultsHeading = (text) => screen.findByRole('heading', { level: 2, name: text })

describe('Search input', () => {
  it('S1/A2: shows debounced, ranked results and announces the count', async () => {
    const { user, router } = renderApp('/search')
    await user.type(searchInput(), 'dragon')

    await resultsHeading('Results for “dragon”')
    await waitFor(() => expect(cardTitles()).toEqual(['Dragonfly Courier', 'The Dragon Who Hated Rain', 'Snapdragon Sisters']))
    expect(screen.getByRole('status')).toHaveTextContent('3 results')
    expect(router.state.location.search).toBe('?q=dragon')
  })

  it('S2: rapid typing triggers a single search for the final value', async () => {
    const { user, api } = renderApp('/search')
    await user.type(searchInput(), 'dra')
    await resultsHeading('Results for “dra”')
    await pause(200)

    const queries = api.search.mock.calls.map(([params]) => params.q).filter(Boolean)
    expect(queries).toEqual(['dra'])
  })

  it('S3: Enter searches immediately without waiting for the debounce', async () => {
    const { user, router } = renderApp('/search', { debounceMs: 60_000 })
    await user.type(searchInput(), 'kaiju{Enter}')

    await resultsHeading('Results for “kaiju”')
    expect(router.state.location.search).toBe('?q=kaiju')
  })

  it('S4: trims the query and matches case- and accent-insensitively', async () => {
    const { user, router } = renderApp('/search')
    await user.type(searchInput(), '  CAFE ')

    await resultsHeading('Results for “CAFE”')
    await waitFor(() => expect(cardTitles()).toEqual(['Café Kaiju']))
    expect(router.state.location.search).toBe('?q=CAFE')
    expect(searchInput()).toHaveValue('  CAFE ')
  })

  it('S5: the clear button empties the input, URL and results', async () => {
    const { user, router } = renderApp('/search?q=ninja')
    await resultsHeading('Results for “ninja”')

    await user.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(searchInput()).toHaveValue('')
    expect(searchInput()).toHaveFocus()
    expect(router.state.location.search).toBe('')
    await resultsHeading('Popular on munch & crunch')
  })
})

describe('Empty query', () => {
  it('E1: shows popular titles instead of a no-results message', async () => {
    renderApp('/search')
    await resultsHeading('Popular on munch & crunch')
    await waitFor(() => expect(cardTitles()).toHaveLength(CATALOG.length))
    expect(cardTitles()[0]).toBe('Snapdragon Sisters')
    expect(screen.queryByRole('region', { name: 'No results' })).not.toBeInTheDocument()
  })

  it('E2: a whitespace-only query is treated as empty', async () => {
    const { user, router } = renderApp('/search')
    await user.type(searchInput(), '   ')
    await pause(250)

    expect(router.state.location.search).toBe('')
    expect(screen.getByRole('heading', { level: 2, name: 'Popular on munch & crunch' })).toBeInTheDocument()
  })
})

describe('Filters', () => {
  it('F1/F6: a genre filter narrows the whole catalogue and updates the URL', async () => {
    const { user, router } = renderApp('/search')
    await user.click(await genreButton('Action'))

    expect(screen.getByRole('button', { name: 'Action' })).toHaveAttribute('aria-pressed', 'true')
    expect(router.state.location.search).toBe('?genre=action')
    await resultsHeading('Browse')
    const expected = CATALOG.filter((i) => i.genres.includes('action')).map((i) => i.title)
    await waitFor(() => expect(cardTitles().sort()).toEqual(expected.sort()))
  })

  it('F2: multiple genres are combined with OR', async () => {
    const { user } = renderApp('/search')
    await user.click(await genreButton('Music'))
    await user.click(screen.getByRole('button', { name: 'Horror' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('5 results'))
  })

  it('F3: genre, type and language are combined with AND', async () => {
    const { user, router } = renderApp('/search')
    await user.click(await genreButton('Fantasy'))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Type' }), 'movie')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Language' }), 'dub')

    expect(router.state.location.search).toBe('?genre=fantasy&type=movie&audio=dub')
    await waitFor(() => expect(cardTitles()).toEqual(['Whisper of the Snow Fox', 'The Dragon Who Hated Rain']))
  })

  it('F4: sorting reorders results', async () => {
    const { user } = renderApp('/search')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'az')
    await waitFor(() => expect(cardTitles().slice(0, 3)).toEqual(['Bento Battle Royale', 'Café Kaiju', 'Dragonfly Courier']))
  })

  it('F5: clear filters keeps the query', async () => {
    const { user, router } = renderApp('/search?q=e&genre=drama&type=movie&audio=dub')
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))

    expect(router.state.location.search).toBe('?q=e')
    expect(searchInput()).toHaveValue('e')
    expect(await genreButton('Drama')).toHaveAttribute('aria-pressed', 'false')
  })
})

describe('Loading and errors', () => {
  it('L1: shows busy skeleton cards until results arrive', async () => {
    const api = controllableApi()
    renderApp('/search', { api })

    await waitFor(() => expect(api.calls).toHaveLength(1))
    expect(screen.getAllByTestId('card-skeleton').length).toBeGreaterThan(0)
    expect(document.querySelector('.grid')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('')

    await act(() => api.calls[0].resolve())
    expect(screen.queryAllByTestId('card-skeleton')).toHaveLength(0)
    expect(document.querySelector('.grid')).toHaveAttribute('aria-busy', 'false')
  })

  it('L2: a stale response that arrives late is ignored', async () => {
    const api = controllableApi()
    const { user } = renderApp('/search?q=ninja', { api, debounceMs: 20 })
    await waitFor(() => expect(api.calls).toHaveLength(1))

    await user.click(screen.getByRole('button', { name: 'Clear search' }))
    await user.type(searchInput(), 'tide')
    await waitFor(() => expect(api.calls.at(-1).params.q).toBe('tide'))

    await act(() => api.calls.at(-1).resolve())
    await act(async () => {
      for (const call of api.calls.slice(0, -1)) await call.resolve()
    })
    expect(cardTitles()).toEqual(['Tidecaller'])
  })

  it('L3: a failed request shows an error with a working retry', async () => {
    const base = createCatalogApi({ items: CATALOG, latency: 0 })
    const api = { ...base, search: vi.fn().mockRejectedValueOnce(new Error('boom')).mockImplementation(base.search) }
    const { user } = renderApp('/search?q=tide', { api })

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong')
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(cardTitles()).toEqual(['Tidecaller']))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('No results', () => {
  it('N1: shows a message with tips and no skeletons', async () => {
    renderApp('/search?q=zzzz')
    const region = await screen.findByRole('region', { name: 'No results' })
    expect(within(region).getByRole('heading', { name: 'No results for “zzzz”' })).toBeInTheDocument()
    expect(within(region).getByText('Check the spelling')).toBeInTheDocument()
    expect(screen.queryAllByTestId('card-skeleton')).toHaveLength(0)
    expect(screen.getByRole('status')).toHaveTextContent('0 results')
  })

  it('N2: offers to clear filters when they exclude everything', async () => {
    const { user, router } = renderApp('/search?q=ninja&genre=horror')
    const region = await screen.findByRole('region', { name: 'No results' })

    await user.click(within(region).getByRole('button', { name: 'Clear filters' }))
    expect(router.state.location.search).toBe('?q=ninja')
    await waitFor(() => expect(cardTitles()).toEqual(['Ninja Accountant', 'Shadow Ninja Requiem']))
  })
})
