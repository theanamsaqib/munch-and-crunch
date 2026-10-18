import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { cardTitles, genreButton, renderApp, searchInput } from './test/renderApp.jsx'

describe('Navigation', () => {
  it('R1: a deep link restores the query, filters and results', async () => {
    renderApp('/search?q=ninja&genre=action')

    expect(searchInput()).toHaveValue('ninja')
    expect(await genreButton('Action')).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => expect(cardTitles()).toEqual(['Ninja Accountant', 'Shadow Ninja Requiem']))
  })

  it('R2/R3: opening a card shows details, and Back restores the search', async () => {
    const { user, router } = renderApp('/search')
    await user.type(searchInput(), 'tide')
    await screen.findByRole('heading', { level: 2, name: 'Results for “tide”' })
    await waitFor(() => expect(cardTitles()).toEqual(['Tidecaller']))
    await user.click(screen.getByRole('link', { name: 'Tidecaller' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Tidecaller' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/series/mc-020/tidecaller')
    expect(screen.getByText(/inherits the power to command the sea/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /back/i }))
    await waitFor(() => expect(searchInput()).toHaveValue('tide'))
    expect(router.state.location.search).toBe('?q=tide')
    await waitFor(() => expect(cardTitles()).toEqual(['Tidecaller']))
  })

  it('R3: genre chips on a detail page link to a filtered search', async () => {
    const { user, router } = renderApp('/series/mc-020/tidecaller')
    await user.click(await screen.findByRole('link', { name: 'Adventure' }))
    expect(router.state.location.search).toBe('?genre=adventure')
    expect(await genreButton('Adventure')).toHaveAttribute('aria-pressed', 'true')
  })

  it('R3: a wrong slug redirects to the canonical URL', async () => {
    const { router } = renderApp('/series/mc-020/wrong-slug')
    await screen.findByRole('heading', { level: 1, name: 'Tidecaller' })
    expect(router.state.location.pathname).toBe('/series/mc-020/tidecaller')
  })

  it('R4: an unknown series shows not-found with a way back', async () => {
    const { user, router } = renderApp('/series/mc-999/nope')
    expect(await screen.findByRole('heading', { name: 'Not found' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Back to search' }))
    expect(router.state.location.pathname).toBe('/search')
  })

  it('R4: an unknown route shows not-found', async () => {
    renderApp('/definitely/not/here')
    expect(await screen.findByRole('heading', { name: 'Not found' })).toBeInTheDocument()
  })

  it('R5: the header search icon opens search with the input focused', async () => {
    const { user, router } = renderApp('/')
    await user.click(screen.getByRole('link', { name: 'Search' }))

    expect(router.state.location.pathname).toBe('/search')
    expect(searchInput()).toHaveFocus()

    await user.click(await genreButton('Comedy'))
    expect(searchInput()).not.toHaveFocus()
    await user.click(screen.getByRole('link', { name: 'Search' }))
    expect(searchInput()).toHaveFocus()
  })

  it('T1: each page sets a descriptive browser title', async () => {
    const { user } = renderApp('/series/mc-020/tidecaller')
    await screen.findByRole('heading', { level: 1, name: 'Tidecaller' })
    await waitFor(() => expect(document.title).toBe('Tidecaller · munch & crunch'))

    await user.click(screen.getByRole('link', { name: 'munch & crunch home' }))
    await waitFor(() => expect(document.title).toBe('munch & crunch'))
  })

  it('P1: the footer links to the privacy page', async () => {
    const { user, router } = renderApp('/')
    await user.click(screen.getByRole('link', { name: 'Privacy' }))
    expect(router.state.location.pathname).toBe('/privacy')
    expect(screen.getByRole('heading', { level: 1, name: 'Privacy' })).toBeInTheDocument()
    expect(screen.getByText(/sets no cookies of its own/)).toBeInTheDocument()
  })

  it('A1: results are reachable and openable by keyboard alone', async () => {
    const { user, router } = renderApp('/search?q=tide')
    await screen.findByRole('link', { name: 'Tidecaller' })

    const target = '/series/mc-020/tidecaller'
    for (let i = 0; i < 40 && document.activeElement?.getAttribute('href') !== target; i++) await user.tab()
    expect(document.activeElement).toHaveAccessibleName('Tidecaller')

    await user.keyboard('{Enter}')
    await waitFor(() => expect(router.state.location.pathname).toBe('/series/mc-020/tidecaller'))
  })
})
