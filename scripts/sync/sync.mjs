#!/usr/bin/env node
// Builds the catalogue from every full-episode playlist on the official channels in
// channels.json, using the YouTube Data API v3 and AniList.
//
//   npm run sync                    all enabled channels
//   npm run sync -- --region=IN     drop episodes blocked in a country (ISO code)
//   npm run sync -- --only=muse-india,gundam
//   npm run sync -- --fresh         ignore cached YouTube responses
//
// Needs YOUTUBE_API_KEY in .env.local (see README). YouTube responses are cached in
// scripts/sync/.cache for 3 days, so a run that hits the daily quota can resume tomorrow.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createAniList } from './anilist.mjs'
import {
  cleanEpisodeTitle, cleanSeriesTitle, cleanSynopsis, detectAudio, episodeSubtitle, formatDuration,
  isEpisodePlaylist, isLimitedTime, isPromoTitle, orderEpisodes, parseDuration, slugify, synopsisSource,
} from './classify.mjs'
import { addVersion, existingShowCount, safeToWrite, writeCatalog } from './write.mjs'
import { createYouTube } from './youtube.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../..')
const cacheDir = path.join(here, '.cache')
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true]))
const MAX_UNITS = Number(args['max-units'] ?? 9500)
const CACHE_TTL = 3 * 24 * 60 * 60 * 1000

function loadEnv() {
  const file = path.join(root, '.env.local')
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

function cached(name, fn) {
  const file = path.join(cacheDir, 'youtube', `${name}.json`)
  if (!args.fresh && fs.existsSync(file) && Date.now() - fs.statSync(file).mtimeMs < CACHE_TTL) {
    return Promise.resolve(JSON.parse(fs.readFileSync(file, 'utf8')))
  }
  return fn().then((data) => {
    fs.writeFileSync(file, JSON.stringify(data))
    return data
  })
}

function blockedIn(region, restriction) {
  if (!region || !restriction) return false
  if (restriction.allowed) return !restriction.allowed.includes(region)
  return (restriction.blocked ?? []).includes(region)
}

async function main() {
  loadEnv()
  const key = process.env.YOUTUBE_API_KEY
  if (!key) {
    console.error('Missing YOUTUBE_API_KEY. Add it to .env.local (see README → "Syncing the catalogue").')
    process.exit(1)
  }
  fs.mkdirSync(path.join(cacheDir, 'youtube'), { recursive: true })

  const yt = createYouTube(key)
  const anilist = createAniList(path.join(cacheDir, 'anilist.json'))
  const overrides = JSON.parse(fs.readFileSync(path.join(here, 'overrides.json'), 'utf8'))
  const only = args.only ? new Set(String(args.only).split(',')) : null
  const channels = JSON.parse(fs.readFileSync(path.join(here, 'channels.json'), 'utf8'))
    .filter((c) => (only ? only.has(c.key) : c.enabled))
  const region = args.region ? String(args.region).toUpperCase() : null
  const stats = { playlists: 0, promo: 0, notEpisodes: 0, accepted: 0, matched: 0, blockedEpisodes: 0 }
  const candidates = []
  let quotaHit = false
  let skippedUncached = 0

  // Once the quota is spent, keep scanning from cache only, so a partial run still
  // uses everything already downloaded.
  async function fetchOrCache(name, fn) {
    if (!quotaHit && yt.unitsUsed >= MAX_UNITS) quotaHit = true
    if (quotaHit) return cachedOnly(name)
    try {
      return await cached(name, fn)
    } catch (err) {
      if (!err.quotaExceeded) throw err
      quotaHit = true
      console.log(`\n⚠ YouTube quota exhausted; continuing from cache only.`)
      return cachedOnly(name)
    }
  }
  function cachedOnly(name) {
    const file = path.join(cacheDir, 'youtube', `${name}.json`)
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'))
    skippedUncached++
    return null
  }

  for (const channel of channels) {
    console.log(`\n▶ ${channel.name}`)
    const playlists = (await fetchOrCache(`playlists-${channel.id}`, () => yt.playlists(channel.id))) ?? []
    const membersOnly = new Set((await fetchOrCache(`members-${channel.id}`, () => yt.membersOnlyIds(channel.id))) ?? [])
    for (const pl of playlists) {
      stats.playlists++
      const title = pl.snippet.title
      if (pl.contentDetails.itemCount < 1 || isPromoTitle(title)) {
        stats.promo++
        continue
      }
      if (args.verbose && !quotaHit) console.log(`  … ${title} (${pl.contentDetails.itemCount} videos, ${yt.unitsUsed} units so far)`)
      const items = await fetchOrCache(`items-${pl.id}`, () => yt.playlistItems(pl.id))
      if (!items) continue
      const meta = await fetchOrCache(`videos-${pl.id}`, async () => {
        const ids = [...new Set(items.map((i) => i.contentDetails.videoId))]
        return Object.fromEntries((await yt.videos(ids)).map((v) => [v.id, v]))
      })
      if (!meta) continue
      const videos = items
        .map((i) => ({ id: i.contentDetails.videoId, title: i.snippet.title, meta: meta[i.contentDetails.videoId] }))
        .filter((v) => v.meta && v.meta.status.privacyStatus === 'public' && v.meta.status.embeddable && !membersOnly.has(v.id))
        .map((v) => ({ ...v, durationSec: parseDuration(v.meta.contentDetails.duration) }))
        .filter((v, i, all) => all.findIndex((x) => x.id === v.id) === i)

      if (!isEpisodePlaylist(title, videos)) {
        stats.notEpisodes++
        continue
      }
      const playable = videos.filter((v) => {
        const blocked = blockedIn(region, v.meta.contentDetails.regionRestriction)
        if (blocked) stats.blockedEpisodes++
        return !blocked
      })
      if (playable.length === 0) continue
      stats.accepted++
      candidates.push({ channel, playlist: pl, videos: orderEpisodes(playable) })
      console.log(`  ✓ ${title} (${playable.length})`)
    }
  }

  if (quotaHit && !args.partial) {
    console.log(`\n⚠ Quota ran out with ${skippedUncached} playlists still to download; the catalogue was NOT changed.`)
    console.log(`  ${stats.accepted} episode playlists are ready. Run again tomorrow to finish (cached results are reused),`)
    console.log('  or pass --partial to build the catalogue from what was collected now.')
    return
  }

  console.log(`\nMatching ${candidates.length} playlists with AniList…`)
  const shows = new Map()
  for (const [i, { channel, playlist, videos }] of candidates.entries()) {
    if (i % 50 === 0) console.log(`  ${i}/${candidates.length}`)
    const seriesTitle = cleanSeriesTitle(playlist.snippet.title)
    if (!seriesTitle) continue
    const media = await anilist.match(seriesTitle)
    if (media) stats.matched++
    const id = media ? `al${media.id}` : `yt-${slugify(seriesTitle)}`
    const override = overrides[id] ?? {}
    const title = override.title ?? media?.title.english ?? media?.title.romaji ?? seriesTitle
    const names = [seriesTitle, title, media?.title.english, media?.title.romaji, ...(media?.synonyms ?? [])]

    if (!shows.has(id)) {
      shows.set(id, {
        id,
        slug: slugify(title.replace(/[【】]/g, '')) || id,
        title,
        altTitles: [...new Set([media?.title.english, media?.title.romaji, seriesTitle, ...(media?.synonyms ?? []).filter((s) => /^[\x20-\x7e]+$/.test(s))])]
          .filter((t) => t && t !== title),
        type: media?.format === 'MOVIE' ? 'movie' : 'series',
        year: media?.seasonYear ?? Number(playlist.snippet.publishedAt.slice(0, 4)),
        genres: (media?.genres ?? []).filter((g) => g !== 'Ecchi' && g !== 'Hentai').map(slugify),
        popularity: media?.popularity ?? 0,
        synopsis: override.synopsis ?? (cleanSynopsis(media?.description) || `Watch ${title} free on ${channel.name}'s official YouTube channel.`),
        synopsisSource: override.synopsis ? null : synopsisSource(media?.description),
        anilistUrl: media?.siteUrl ?? null,
        versions: [],
      })
    }
    const audio = detectAudio(playlist.snippet.title)
    const version = {
      key: `${channel.key}-${audio}`,
      channelKey: channel.key,
      channel: channel.name,
      channelUrl: channel.url,
      playlistId: playlist.id,
      audio,
      limitedTime: isLimitedTime(playlist.snippet.title),
      episodes: videos.map((v, i) => ({
        n: i + 1,
        videoId: v.id,
        title: episodeSubtitle(cleanEpisodeTitle(v.title), names),
        duration: formatDuration(v.durationSec),
      })),
    }
    addVersion(shows.get(id), version, seriesTitle)
  }
  for (const show of shows.values()) show.versions.sort((a, b) => b.episodes.length - a.episodes.length)

  const dataDir = path.join(root, 'public', 'data')
  const verdict = safeToWrite(shows.size, existingShowCount(dataDir), Boolean(args.force))
  if (!verdict.ok) {
    console.log(`\n✖ ${verdict.reason} The catalogue was NOT changed.`)
    console.log(`  playlists scanned ${stats.playlists} (${stats.promo} promotional skipped, ${stats.notEpisodes} not episodes), ${stats.accepted} accepted`)
    process.exitCode = 1
    return
  }
  const totals = writeCatalog(dataDir, [...shows.values()], {
    channels: channels.map(({ key, name, url }) => ({ key, name, url })),
  })
  console.log(`
Done.
  playlists scanned     ${stats.playlists} (${stats.promo} promotional skipped, ${stats.notEpisodes} not episodes)
  episode playlists     ${stats.accepted} (${stats.matched} matched on AniList)
  shows written         ${totals.shows}
  episodes              ${totals.episodes}${region ? `\n  blocked in ${region}         ${stats.blockedEpisodes} episodes dropped` : ''}
  YouTube quota, this run ${yt.unitsUsed} units of 10,000/day (cached responses cost nothing)`)
}

main().catch((err) => {
  console.error(`\n✖ ${err.message}`)
  process.exit(1)
})
