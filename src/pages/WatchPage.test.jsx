import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { cardTitles, renderApp, searchInput } from '../test/renderApp.jsx'
import { SHOWS } from '../test/realCatalog.js'

const real = { items: SHOWS }
const aot = SHOWS.find((s) => s.slug === 'attack-on-titan')
const aotEpisodes = aot.versions[0].episodes
const player = () => screen.getByTitle(/^Attack on Titan:/)

// An extra, clearly fake version on top of real data, to exercise the version picker
// independently of how many versions the real show has.
const extra = { ...aot.versions[0], key: 'test-extra', audio: 'ta', channel: 'Test Channel', label: 'Test Channel · Tamil dub', episodes: aotEpisodes.slice(0, 5) }
const multi = { items: SHOWS.map((s) => (s === aot ? { ...aot, versions: [...aot.versions, extra] } : s)) }
const episodeLinks = (region) => within(region).getAllByRole('link').filter((l) => l.getAttribute('href').startsWith('/watch/'))

describe('Watching real episodes', () => {
  it('W1: search finds a real show by its romaji title, ranked first', async () => {
    const { user } = renderApp('/search', real)
    await user.type(searchInput(), 'shingeki no kyojin')
    await waitFor(() => expect(cardTitles()[0]).toBe('Attack on Titan'))
  })

  it('W10: large result sets are shown 48 at a time with a working "Show more"', async () => {
    const { user } = renderApp('/search', real)
    await waitFor(() => expect(cardTitles()).toHaveLength(48))
    expect(screen.getByRole('status')).toHaveTextContent(`${SHOWS.length} results`)

    await user.click(screen.getByRole('button', { name: `Show more (${SHOWS.length - 48} left)` }))
    expect(cardTitles()).toHaveLength(Math.min(96, SHOWS.length))
  })

  it('W2: the series page lists episodes and starts at episode 1', async () => {
    const { user, router } = renderApp(`/series/${aot.id}/${aot.slug}`, real)
    const episodes = await screen.findByRole('region', { name: 'Episodes' })
    expect(episodeLinks(episodes)).toHaveLength(aotEpisodes.length)
    expect(screen.getByRole('link', { name: aot.versions[0].channel })).toHaveAttribute('href', aot.versions[0].channelUrl)

    await user.click(screen.getByRole('link', { name: /start watching/i }))
    expect(router.state.location.pathname).toBe(`/watch/${aot.id}/1`)
  })

  it('W3: the watch page embeds the official video with privacy-enhanced YouTube', async () => {
    renderApp(`/watch/${aot.id}/1`, real)
    await screen.findByRole('heading', { level: 1 })

    const src = new URL(player().getAttribute('src'))
    expect(src.origin).toBe('https://www.youtube-nocookie.com')
    expect(src.pathname).toBe(`/embed/${aotEpisodes[0].videoId}`)
    expect(player()).toHaveAttribute('allowfullscreen')
    expect(screen.getByRole('link', { name: 'Open it on YouTube' }).getAttribute('href')).toContain(aot.versions[0].playlistId)
  })

  it('W4: next/previous move between episodes and update the player', async () => {
    const { user, router } = renderApp(`/watch/${aot.id}/1`, real)
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('link', { name: /previous/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /next episode/i }))
    expect(router.state.location.pathname).toBe(`/watch/${aot.id}/2`)
    await waitFor(() => expect(player().getAttribute('src')).toContain(aotEpisodes[1].videoId))

    const sidebar = screen.getByRole('complementary', { name: 'Episodes' })
    expect(within(sidebar).getAllByRole('link').find((l) => l.getAttribute('aria-current') === 'true'))
      .toHaveAttribute('href', `/watch/${aot.id}/2`)

    await user.click(screen.getByRole('link', { name: /previous/i }))
    expect(router.state.location.pathname).toBe(`/watch/${aot.id}/1`)
  })

  it('W5: the last episode has no next button', async () => {
    renderApp(`/watch/${aot.id}/${aotEpisodes.length}`, real)
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('link', { name: /next episode/i })).not.toBeInTheDocument()
  })

  it('W6: an unknown episode shows not-found', async () => {
    renderApp(`/watch/${aot.id}/9999`, real)
    expect(await screen.findByRole('heading', { name: 'Not found' })).toBeInTheDocument()
    expect(screen.getByText('We couldn’t find that episode.')).toBeInTheDocument()
  })

  it('W7: the language filter finds the English-dubbed shows', async () => {
    const { user } = renderApp('/search', real)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Language' }), 'dub')
    const dubbed = SHOWS.filter((s) => s.audio.includes('dub')).map((s) => s.title)
    await waitFor(() => expect(cardTitles().sort()).toEqual(dubbed.sort()))
  })

  it('W8: switching version keeps the episode number and plays that version', async () => {
    const { user, router } = renderApp(`/watch/${aot.id}/3`, multi)
    const picker = await screen.findByRole('navigation', { name: 'Versions' })

    await user.click(within(picker).getByRole('link', { name: /Test Channel/ }))
    expect(router.state.location.pathname).toBe(`/watch/${aot.id}/3`)
    expect(router.state.location.search).toBe('?v=test-extra')
    expect(screen.getByRole('link', { name: 'Test Channel' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /next episode/i }))
    expect(router.state.location.search).toBe('?v=test-extra')
  })

  it('W9: the series page episode list follows the selected version', async () => {
    renderApp(`/series/${aot.id}/${aot.slug}?v=test-extra`, multi)
    const links = episodeLinks(await screen.findByRole('region', { name: 'Episodes' }))
    expect(links).toHaveLength(5)
    expect(links[0]).toHaveAttribute('href', `/watch/${aot.id}/1?v=test-extra`)
  })
})
