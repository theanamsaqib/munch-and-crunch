import { describe, expect, it } from 'vitest'
import {
  bestTitleMatch, cleanEpisodeTitle, cleanSeriesTitle, cleanSynopsis, detectAudio, episodeSubtitle,
  formatDuration, isEpisodePlaylist, isLimitedTime, isPromoTitle, orderEpisodes, parseDuration,
  searchVariants, seasonLabel, synopsisSource,
} from './classify.mjs'
import { addVersion, safeToWrite } from './write.mjs'

describe('sync: merging playlists into versions', () => {
  const eps = (...ids) => ids.map((videoId, i) => ({ n: i + 1, videoId }))
  const version = (key, ...ids) => ({ key, channelKey: 'muse-asia', audio: 'sub', episodes: eps(...ids) })

  it('keeps the longer playlist when one contains the other (season inside full series)', () => {
    const show = { title: 'Mob Psycho 100', versions: [] }
    addVersion(show, version('muse-asia-sub', 'a', 'b', 'c'), 'Mob Psycho 100 S3')
    addVersion(show, version('muse-asia-sub', 'x', 'y', 'a', 'b', 'c'), 'Mob Psycho 100 (Full Series)')
    expect(show.versions).toHaveLength(1)
    expect(show.versions[0].episodes.map((e) => e.videoId)).toEqual(['x', 'y', 'a', 'b', 'c'])
    expect(show.versions[0].key).toBe('muse-asia-sub')
  })

  it('keeps separate seasons as separate, labelled versions', () => {
    const show = { title: 'Mob Psycho 100', versions: [] }
    addVersion(show, version('muse-asia-sub', 'a', 'b'), 'Mob Psycho 100 (S1)')
    addVersion(show, version('muse-asia-sub', 'c', 'd'), 'Mob Psycho 100 III (S3)')
    expect(show.versions.map((v) => v.key)).toEqual(['muse-asia-sub', 'muse-asia-sub-2'])
    expect(show.versions[1].note).toBe('Season 3')
  })

  it('labels seasons readably', () => {
    expect(seasonLabel("JoJo's Bizarre Adventure (Season 4): Golden Wind", "JoJo's Bizarre Adventure")).toBe('Season 4')
    expect(seasonLabel('Gintama Maru(Season 7)', 'Gintama')).toBe('Season 7')
    expect(seasonLabel('Re:ZERO Director’s Cut', 'Re:ZERO')).toBe('Director’s Cut')
  })

  it('treats other channels and languages as separate versions', () => {
    const show = { title: 'X', versions: [] }
    addVersion(show, version('muse-asia-sub', 'a'), 'X')
    addVersion(show, { ...version('muse-india-hi', 'h'), channelKey: 'muse-india', audio: 'hi' }, 'X')
    expect(show.versions).toHaveLength(2)
  })
})
import { pickMatch } from './anilist.mjs'

describe('sync: AniList match choice', () => {
  const ova = { id: 1, title: { english: "JoJo's Bizarre Adventure" }, popularity: 20000 }
  const tv = { id: 2, title: { english: "JoJo's Bizarre Adventure" }, popularity: 480000 }
  const other = { id: 3, title: { english: 'Mob Psycho 100' }, popularity: 900000 }

  it('breaks title ties by popularity, regardless of search order', () => {
    expect(pickMatch("JoJo's Bizarre Adventure", [ova, tv]).id).toBe(2)
    expect(pickMatch("JoJo's Bizarre Adventure", [tv, ova]).id).toBe(2)
  })

  it('prefers a better title match over popularity, and rejects weak matches', () => {
    expect(pickMatch("JoJo's Bizarre Adventure", [other, ova]).id).toBe(1)
    expect(pickMatch('Something Else Entirely', [other])).toBeNull()
    expect(pickMatch('Anything', [{ ...tv, isAdult: true }])).toBeNull()
  })
})

describe('sync: write guard', () => {
  it('never replaces the catalogue with an empty or much smaller one unless forced', () => {
    expect(safeToWrite(0, 17).ok).toBe(false)
    expect(safeToWrite(0, 0).ok).toBe(false)
    expect(safeToWrite(5, 17).ok).toBe(false)
    expect(safeToWrite(5, 17, true).ok).toBe(true)
    expect(safeToWrite(300, 17).ok).toBe(true)
  })
})

const eps = (...minutes) => minutes.map((m) => ({ durationSec: m * 60 }))

describe('sync: playlist classification', () => {
  it('accepts episode-length playlists and full movies', () => {
    expect(isEpisodePlaylist('Attack on Titan', eps(24, 24, 23, 25))).toBe(true)
    expect(isEpisodePlaylist('[EN Sub] Mobile Suit Gundam MOVIE', eps(95, 102))).toBe(true)
  })

  it('rejects promotional playlists and clip collections', () => {
    expect(isEpisodePlaylist('Official Trailers', eps(24, 24))).toBe(false)
    expect(isEpisodePlaylist('GUNPLA / FIGURE', eps(20, 20))).toBe(false)
    expect(isEpisodePlaylist('Latest Content', eps(24, 24))).toBe(false)
    expect(isEpisodePlaylist('Best moments', eps(2, 3, 4, 2))).toBe(false)
    expect(isEpisodePlaylist('Something', [])).toBe(false)
  })

  it('pre-screens titles without needing any video data', () => {
    expect(isPromoTitle('Attack on Titan')).toBe(false)
    expect(isPromoTitle('[Hindi Dub] Mob Psycho 100 | Muse IN')).toBe(false)
    expect(isPromoTitle('Official Trailers')).toBe(true)
    expect(isPromoTitle('Demon Slayer: Kimetsu no Yaiba Moments')).toBe(true)
    expect(isPromoTitle('기동전사 건담 SEED ECLIPSE')).toBe(true)
    expect(isPromoTitle('Hina Logic [中字]')).toBe(true)
    expect(isPromoTitle('Hina Logic [English Sub]')).toBe(false)
  })

  it('does not mistake words inside show titles for promo keywords', () => {
    expect(isEpisodePlaylist('The Exiled Heavy Knight Knows How to Game the System [English Sub]', eps(24, 24))).toBe(true)
    expect(isEpisodePlaylist('I’m Living with an Otaku NEET Kunoichi!?｜我與尼特女忍者的莫名同居生活【Ani-One Asia】', eps(24, 24))).toBe(true)
  })

  it('skips playlists aimed at non-English audiences but keeps Indian-language dubs', () => {
    expect(isEpisodePlaylist('기동전사 건담 SEED ECLIPSE', eps(24, 24))).toBe(false)
    expect(isEpisodePlaylist('SD高達 三國創傑傳『蒼翔記』(香港中文字幕版)', eps(24, 24))).toBe(false)
    expect(isEpisodePlaylist('[Hindi Dub] Mob Psycho 100 | Muse IN', eps(24, 24))).toBe(true)
    expect(isEpisodePlaylist('SPY×FAMILY', eps(24, 24))).toBe(true)
  })

  it('detects audio language and limited-time uploads', () => {
    expect(detectAudio('[Hindi Dub] Mob Psycho 100')).toBe('hi')
    expect(detectAudio('[Tamil Dub] Skeleton Knight in Another World | Muse IN')).toBe('ta')
    expect(detectAudio('[Telugu Dub] Mob Psycho 100 | Muse IN')).toBe('te')
    expect(detectAudio('Fairy Tail [English Dub]')).toBe('dub')
    expect(detectAudio('Mobile Suit Gundam the Witch from Mercury (EN dub)')).toBe('dub')
    expect(detectAudio('SPY×FAMILY')).toBe('sub')
    expect(isLimitedTime('《【OSHI NO KO】》【Limited-Time Free to Watch】')).toBe(true)
    expect(isLimitedTime('BLEACH')).toBe(false)
  })
})

describe('sync: title cleaning', () => {
  it('strips channel tags, language tags and bilingual suffixes from series titles', () => {
    expect(cleanSeriesTitle('[2026 Oct] The Detective Is Already Dead Season 2 [English Sub]')).toBe('The Detective Is Already Dead Season 2')
    expect(cleanSeriesTitle('(Full Series) Mushoku Tensei: Jobless Reincarnation [English Sub]')).toBe('Mushoku Tensei: Jobless Reincarnation')
    expect(cleanSeriesTitle('To Your Eternity｜給不滅的你【Ani-One Asia】')).toBe('To Your Eternity')
    expect(cleanSeriesTitle('[Hindi Dub] Mob Psycho 100 | Muse IN')).toBe('Mob Psycho 100')
    expect(cleanSeriesTitle('Mobile Suit Gundam the Witch from Mercury(EN Sub)')).toBe('Mobile Suit Gundam the Witch from Mercury')
    expect(cleanSeriesTitle('Demon Slayer: Kimetsu no Yaiba Infinity Castle I - now on OTT platforms')).toBe('Demon Slayer: Kimetsu no Yaiba Infinity Castle I')
    expect(cleanSeriesTitle('【OSHI NO KO】| 【我推的孩子】【限時免費公開】【Ani-One Asia】')).toBe('OSHI NO KO')
    expect(cleanSeriesTitle('《【OSHI NO KO】》|《【我推的孩子】》【Limited-Time Free to Watch】【Ani-One Asia】')).toBe('OSHI NO KO')
    expect(cleanSeriesTitle('《【OSHI NO KO】》Season 3 |《【我推的孩子】》(第三季)【Limited-Time Free to Watch】')).toBe('OSHI NO KO Season 3')
    expect(cleanSeriesTitle('【EN Dub ver】Mobile Suit Gundam SEED')).toBe('Mobile Suit Gundam SEED')
  })

  it('reduces episode titles to their informative part', () => {
    const names = ['Attack on Titan']
    expect(episodeSubtitle(cleanEpisodeTitle('Attack on Titan - Episode 01 (S1E01) [English Sub]'), names)).toBe('Episode 01 (S1E01)')
    expect(episodeSubtitle(cleanEpisodeTitle('《BLEACH》#2 (ENG sub | JP dub)【Ani-One Asia】'), ['BLEACH'])).toBe('')
    expect(episodeSubtitle(cleanEpisodeTitle('SPY×FAMILY - Episode 01 [English Sub]'), ['SPY×FAMILY'])).toBe('')
  })

  it('reorders shuffled but fully numbered playlists, and leaves others alone', () => {
    const shuffled = ['#3 C', '#1 A', '#2 B'].map((title) => ({ title }))
    expect(orderEpisodes(shuffled).map((v) => v.title)).toEqual(['#1 A', '#2 B', '#3 C'])
    const unnumbered = ['Prologue', '#1 A', '#2 B'].map((title) => ({ title }))
    expect(orderEpisodes(unnumbered)).toBe(unnumbered)
  })
})

describe('sync: season-aware AniList search terms', () => {
  it('normalises the many ways channels write seasons', () => {
    expect(searchVariants('Mob Psycho 100 (S1)')).toEqual(['Mob Psycho 100 (S1)', 'Mob Psycho 100'])
    expect(searchVariants('NO GUNS LIFE S2')).toEqual(['NO GUNS LIFE S2', 'NO GUNS LIFE Season 2', 'NO GUNS LIFE'])
    expect(searchVariants('Gintama Maru(Season 7)')).toContain('Gintama Maru Season 7')
    expect(searchVariants('Dorohedoro Season2')).toContain('Dorohedoro Season 2')
    expect(searchVariants('Ace of the Diamond actⅡ -Second Season')).toContain('Ace of the Diamond actⅡ Season 2')
  })

  it('keeps subtitles, full-series ranges, leading markers and romaji alternatives', () => {
    expect(searchVariants("JoJo's Bizarre Adventure (Season 3): Diamond is Unbreakable"))
      .toEqual(["JoJo's Bizarre Adventure (Season 3): Diamond is Unbreakable", "JoJo's Bizarre Adventure: Diamond is Unbreakable", 'Diamond is Unbreakable'])
    expect(searchVariants("JoJo's Bizarre Adventure (S1-S4 All Complete Series)")[1]).toBe("JoJo's Bizarre Adventure")
    expect(searchVariants("(S1) BOFURI: I Don't Want to Get Hurt")[1]).toBe("BOFURI: I Don't Want to Get Hurt")
    expect(searchVariants('The Ones Within (Naka no Hito Genome )')).toEqual(['The Ones Within (Naka no Hito Genome )', 'The Ones Within', 'Naka no Hito Genome'])
    expect(searchVariants('Attack on Titan')).toEqual(['Attack on Titan'])
    expect(searchVariants('Mobile Suit Gundam SEED HD Remaster')).toContain('Mobile Suit Gundam SEED')
    expect(searchVariants('Chainsaw Man – The Compilation')).toContain('Chainsaw Man')
    expect(searchVariants("Re:ZERO -Starting Life in Another World- Director's Cut")).toContain('Re:ZERO -Starting Life in Another World-')
  })
})

describe('sync: playlists that are not a single show', () => {
  it('excludes multi-show collections, radio, events and foreign-audience copies', () => {
    for (const t of ['Action Anime Full Episodes', 'Full Anime Episodes (SUB/DUB)', '🏃Full Season Marathon🏃', 'Complete Series',
      'Aniplex After Hours', 'GBWC 2016 World Championship Awards Ceremony (EN.CN.KR Dub)', 'Radio Unnamed Memory',
      'Anime Japan 2024 3.24 SUN', '粉彩回憶 Pastel Memories', 'Tagalog Dub Complete Series']) {
      expect(isPromoTitle(t), t).toBe(true)
    }
    expect(isPromoTitle('Pastel Memories')).toBe(false)
    expect(isPromoTitle('Burn the Witch - English Sub]')).toBe(false)
  })

  it('cleans leftovers seen in real titles', () => {
    expect(cleanSeriesTitle('Burn the Witch - English Sub]')).toBe('Burn the Witch')
    expect(cleanSeriesTitle('Mobile Suit Gundam SEED HD Remaster(w/subtiteles)')).toBe('Mobile Suit Gundam SEED HD Remaster')
    expect(cleanSeriesTitle('BLEACH︳BLEACH 死神')).toBe('BLEACH')
    expect(cleanSeriesTitle('#ULTRAEarlyBird搶先看Rooster Fighter')).toBe('Rooster Fighter')
    expect(cleanSeriesTitle('DEAD MOUNT DEATH PLAY EP1-12')).toBe('DEAD MOUNT DEATH PLAY')
    expect(cleanSeriesTitle('Spy x Family Episode -')).toBe('Spy x Family')
  })

  it('extracts the AniList description source credit', () => {
    expect(synopsisSource('Text.<br><br>(Source: Kodansha Comics)')).toBe('Kodansha Comics')
    expect(synopsisSource('No credit here.')).toBeNull()
  })
})

describe('sync: helpers', () => {
  it('parses and formats ISO 8601 durations', () => {
    expect(parseDuration('PT23M41S')).toBe(1421)
    expect(parseDuration('PT1H22M1S')).toBe(4921)
    expect(parseDuration('P0D')).toBe(0)
    expect(formatDuration(1421)).toBe('23:41')
    expect(formatDuration(4921)).toBe('1:22:01')
  })

  it('scores AniList candidates by title overlap', () => {
    const aot = { title: { english: 'Attack on Titan', romaji: 'Shingeki no Kyojin' }, synonyms: ['AoT'] }
    expect(bestTitleMatch('Attack on Titan', aot)).toBe(1)
    expect(bestTitleMatch('Shingeki no Kyojin', aot)).toBe(1)
    expect(bestTitleMatch('Mob Psycho 100', aot)).toBe(0)
  })

  it('cleans AniList descriptions and drops source notes', () => {
    const html = 'First line.<br><br>\n\nSecond <i>para</i>.<br><br>(Source: Kodansha)<br><br><i>Note: aired early.</i>'
    expect(cleanSynopsis(html)).toBe('First line.\n\nSecond para.')
  })
})
