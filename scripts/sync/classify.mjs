// Pure helpers that turn raw YouTube playlist data into show/episode records.
// Kept free of I/O so they can be unit-tested (see classify.test.js).

export const AUDIO_LABELS = {
  sub: 'English subtitles',
  dub: 'English dub',
  hi: 'Hindi dub',
  ta: 'Tamil dub',
  te: 'Telugu dub',
}

export function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// "PT1H2M3S" -> 3723
export function parseDuration(iso = '') {
  const m = iso.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/)
  if (!m) return 0
  const [d, h, min, s] = m.slice(1).map((part) => Number(part ?? 0))
  return d * 86400 + h * 3600 + min * 60 + s
}

export function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = String(seconds % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

const NON_EPISODE = /\b(trailers?|teasers?|pvs?|promos?|previews?|clips?|highlights?|moments|openings?|endings?|op|ed|ncop|nced|music|songs?|mv|shorts?|interviews?|events?|live|streams?|behind|making|commercials?|cm|messages?|announcements?|reactions?|asmr|vlogs?|gunpla|figures?|recaps?|specials? movie|latest content|pickup|news|podcasts?|karaoke|lyrics?|sneak peeks?|first look)\b/i

// Channels such as GUNDAM post Korean/Chinese-subtitled copies; their titles are mostly non-Latin.
// Indian-language dubs keep English titles ("[Hindi Dub] …"), so they pass.
const NON_ENGLISH_SUB_TAG = /中字|中文|字幕|繁中|簡中|简中|자막|한국어|\b(indo|thai|viet|vietsub|tagalog|filipino)\b/i

export function isEnglishAudience(title) {
  // Tags like "[中字]" mark Chinese-subtitled copies of shows with English titles.
  if (NON_ENGLISH_SUB_TAG.test(title)) return false
  const cleaned = cleanSeriesTitle(title)
  const latin = (cleaned.match(/[A-Za-z]/g) ?? []).length
  // One Han/Hangul/kana character carries roughly a syllable, so weight it like several Latin letters.
  const other = (cleaned.match(/[\p{L}]/gu) ?? []).length - latin
  return latin > 0 && latin >= other * 3
}

const isEpisodeLength = (sec) => sec >= 12 * 60 && sec <= 40 * 60
const isLongForm = (sec) => sec > 40 * 60 // movies and season compilations

// Playlists that mix many shows (Crunchyroll's "Action Anime Full Episodes"), radio shows,
// events and award ceremonies can't be presented as one show.
const NOT_ONE_SHOW = /anime full episodes|full anime episodes|marathon|^complete series$|after hours|aniplex next|awards?\b|ceremony|\bradio\b|ラジオ|anime ?japan \d{4}|quizknock/i

// Title-only check, used to skip promotional playlists before spending quota on their videos.
export function isPromoTitle(title) {
  if (NON_EPISODE.test(title) || NOT_ONE_SHOW.test(title) || !isEnglishAudience(title)) return true
  // "粉彩回憶 Pastel Memories": a Chinese title first marks a Chinese-audience copy.
  return /^[\p{Script=Han}\p{Script=Hangul}]/u.test(cleanSeriesTitle(title))
}

// A playlist counts as watchable episodes if its title isn't promotional and
// most of its playable videos are episode-length (or it holds feature-length videos).
export function isEpisodePlaylist(title, videos) {
  if (isPromoTitle(title)) return false
  const playable = videos.filter((v) => v.durationSec > 0)
  if (playable.length === 0) return false
  const episodeish = playable.filter((v) => isEpisodeLength(v.durationSec)).length
  const longform = playable.filter((v) => isLongForm(v.durationSec)).length
  if (playable.length >= 2 && episodeish / playable.length >= 0.6) return true
  return longform / playable.length >= 0.6
}

export function detectAudio(title) {
  if (/hindi/i.test(title)) return 'hi'
  if (/tamil/i.test(title)) return 'ta'
  if (/telugu/i.test(title)) return 'te'
  if (/\b(english dub|eng dub|en dub|dubbed)\b|英語吹替/i.test(title)) return 'dub'
  return 'sub'
}

export function isLimitedTime(title) {
  return /limited[- ]time|限時/i.test(title)
}

// "[2026 Oct] The Detective Is Already Dead Season 2 [English Sub]" -> "The Detective Is Already Dead Season 2"
const BRACKET_TAG = /ani-one|muse|limited|free|\b(en|eng|english)\b|\bdub\b|\bsub\b|\bver\b/i

export function cleanSeriesTitle(raw) {
  let t = raw
    // 【…】 holds either a tag (【Ani-One Asia】, 【EN Dub ver】) or the title itself (【OSHI NO KO】).
    .replace(/【([^】]*)】/g, (_, inner) => (/[A-Za-z]/.test(inner) && !BRACKET_TAG.test(inner) ? ` ${inner} ` : ' '))
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\((?:full series|full season|en(?:glish)? (?:sub|dub)|eng sub[^)]*|w\/sub\w*|hindi|tamil|telugu)[^)]*\)/gi, ' ')
    .replace(/\s+\|\s+Muse\s+\w+$/i, '')
    .replace(/[《》]/g, '')
    .replace(/^#ULTRAEarlyBird\S*?(?=[A-Za-z])/i, '')
    .replace(/[\s-]*\b(?:english|eng) (?:sub|dub)\]?\s*$/i, '')
    .replace(/\s+EP\d+-\d+$/i, '')
    .replace(/\s+Episode\s*-?\s*$/i, '')
  // Ani-One titles are "English｜Chinese" (also written with "︳"); keep the English half.
  t = t.split(/[｜|︳]/)[0]
  return t.replace(/\s+/g, ' ').replace(/\s*-\s*now on .*$/i, '').replace(/[\s-]+$/, '').trim()
}

const SEASON = String.raw`(?:season\s*(\d+)|s(\d+)|(second|third|fourth|fifth) season)`
const ORDINALS = { second: 2, third: 3, fourth: 4, fifth: 5 }

// Short label telling seasons of one show apart: "Mob Psycho 100 III (S3)" -> "Season 3".
export function seasonLabel(playlistTitle, showTitle) {
  const m = playlistTitle.match(new RegExp(SEASON, 'i'))
  if (m) return `Season ${Number(m[1] ?? m[2] ?? ORDINALS[m[3]?.toLowerCase()])}`
  const rest = playlistTitle.toLowerCase().startsWith(showTitle.toLowerCase())
    ? playlistTitle.slice(showTitle.length)
    : playlistTitle
  return rest.replace(/[()]/g, '').replace(/^[\s:\-–]+|[\s:\-–]+$/g, '')
}

// Search terms to try on AniList, most specific first. Channels write seasons many ways
// ("(S3)", "S3", "(Season 3): Subtitle", "Season2", "-Second Season-"), AniList usually uses
// "Title Season 3" or "Title: Subtitle", and season 1 is just "Title".
export function searchVariants(title) {
  const variants = [title]
  // "(S1-S4 All Complete Series)" is the whole show.
  const range = title.match(/\s*\(\s*S\d+\s*[-–]\s*S\d+[^)]*\)\s*/i)
  const marker = new RegExp(String.raw`\s*[(\-]?\s*${SEASON}\s*[)\-]?\s*`, 'i')
  const m = !range && title.match(marker)
  if (range) {
    variants.push(title.slice(0, range.index).trim())
  } else if (m) {
    const n = Number(m[1] ?? m[2] ?? ORDINALS[m[3]?.toLowerCase()])
    const before = title.slice(0, m.index).trim()
    const after = title.slice(m.index + m[0].length).replace(/^[:\s]+/, '').trim()
    if (after) variants.push(...(before ? [`${before}: ${after}`] : []), after)
    else variants.push(n > 1 ? `${before} Season ${n}` : before, before)
  }
  // Edition labels hide the base title: "Mobile Suit Gundam SEED HD Remaster" -> "Mobile Suit Gundam SEED".
  const edition = /(?:\s+[-–:])?\s+(?:the compilation|hd remaster(?:ed)?|director[’']?s cut|cour \d+)\s*$/i
  for (const v of [...variants]) if (edition.test(v)) variants.push(v.replace(edition, ''))
  // "The Ones Within (Naka no Hito Genome)": try the outer and the romaji inner title.
  const paren = title.match(/^(.+?)\s*\(([^)]+)\)\s*$/)
  if (paren && !new RegExp(SEASON, 'i').test(paren[2])) variants.push(paren[1].trim(), paren[2].trim())
  return [...new Set(variants.map((v) => v.replace(/\s+/g, ' ').trim()).filter((v) => v.length > 1))]
}

export function cleanEpisodeTitle(raw) {
  return raw
    .replace(/【[^】]*】/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\((ENG sub \| JP dub|w\/subtitles|EN dub|EN sub)\)|（EN dub）/gi, '')
    .replace(/\|\s*Muse\s+\w+\s*$/i, '')
    .replace(/[《》]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([|-])\s*$/, '')
    .trim()
}

// Drops the repeated show name and bare "Episode 01"/"#1" labels; the UI shows "Episode N" itself.
export function episodeSubtitle(cleaned, names) {
  const lower = cleaned.toLowerCase()
  const prefix = names
    .filter(Boolean)
    .map((n) => n.replace(/[【】]/g, '').toLowerCase())
    .filter((n) => lower.startsWith(n))
    .sort((a, b) => b.length - a.length)[0]
  const rest = (prefix ? cleaned.slice(prefix.length) : cleaned).replace(/^[\s:|\-–]+/, '').trim()
  return /^(episode\s*\d+|ep\.?\s*\d+|#\s*\d+)$/i.test(rest) ? '' : rest
}

export function episodeNumber(title) {
  const m = title.match(/(?:episode|ep\.?|#)\s*0*(\d+)/i)
  return m ? Number(m[1]) : null
}

// Keep playlist order, unless every episode carries a unique number and the playlist is shuffled.
export function orderEpisodes(videos) {
  const numbers = videos.map((v) => episodeNumber(v.title))
  const allNumbered = numbers.every((n) => n !== null) && new Set(numbers).size === numbers.length
  const sorted = numbers.every((n, i) => i === 0 || n > numbers[i - 1])
  if (!allNumbered || sorted) return videos
  return videos.map((v, i) => [v, numbers[i]]).sort((a, b) => a[1] - b[1]).map(([v]) => v)
}

const tokens = (s) => new Set(slugify(s).split('-').filter((w) => w.length > 1))

// Share of the query's words found in the candidate title (0..1).
export function titleSimilarity(query, candidate) {
  const q = tokens(query)
  const c = tokens(candidate)
  if (q.size === 0) return 0
  let hit = 0
  for (const w of q) if (c.has(w)) hit++
  return hit / q.size
}

export function bestTitleMatch(query, media) {
  const names = [media.title?.english, media.title?.romaji, ...(media.synonyms ?? [])].filter(Boolean)
  return Math.max(0, ...names.map((n) => titleSimilarity(query, n)))
}

// AniList descriptions often end with "(Source: Kodansha Comics)"; keep that credit.
export function synopsisSource(html) {
  return html?.match(/\(Source:\s*([^)]+)\)/i)?.[1].replace(/<[^>]+>/g, '').trim() ?? null
}

export function cleanSynopsis(html) {
  if (!html) return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#039;|&rsquo;/g, '’')
    .replace(/\n{2,}/g, '\n\n')
    .split(/\n\n/)
    .map((p) => p.trim())
    .filter((p) => p && !/^\(?source:/i.test(p) && !/^note:/i.test(p))
    .join('\n\n')
    .trim()
}
