import { genresOf } from '../../lib/search.js'

// Fictional titles used only by tests, so test expectations never depend on real-world data.
// They have no episodes or thumbnails, so cards fall back to generated posters.

export function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const RAW = [
  ['Lanterns of the Fallow Moon', 'series', 2023, 24, ['fantasy', 'drama'], ['sub', 'dub'], '13+', 88, 262,
    'A lamplighter in a dimming kingdom discovers each lantern holds a stolen memory.'],
  ['Kitchen Ronin', 'series', 2021, 12, ['comedy', 'slice-of-life'], ['sub', 'dub'], 'All', 74, 24,
    'A disgraced swordsman finds a second life slicing vegetables at a seaside diner.', ['Daidokoro Ronin']],
  ['Static Bloom', 'series', 2024, 12, ['sci-fi', 'romance'], ['sub'], '13+', 67, 320,
    'Two radio operators fall for each other through a signal that should not exist.'],
  ['Iron Tea Ceremony', 'series', 2019, 26, ['action', 'drama'], ['sub', 'dub'], '16+', 81, 8,
    'Rival tea houses settle their disputes with steel, steam and impeccable manners.'],
  ['Dragonfly Courier', 'series', 2022, 13, ['adventure', 'fantasy'], ['sub', 'dub'], 'All', 59, 150,
    'A girl delivers letters across a floating archipelago on the back of a giant dragonfly.'],
  ['The Dragon Who Hated Rain', 'movie', 2020, null, ['fantasy', 'comedy'], ['sub', 'dub'], 'All', 70, 200,
    'A grumpy storm dragon goes on strike, and a village must convince it to sulk elsewhere.'],
  ['Café Kaiju', 'series', 2025, 12, ['comedy', 'slice-of-life'], ['sub'], 'All', 52, 35,
    'A retired city-stomping monster opens a very small coffee shop.'],
  ['Neon Shrine Detectives', 'series', 2024, 24, ['mystery', 'sci-fi'], ['sub', 'dub'], '16+', 90, 290,
    'Shrine keepers solve crimes in a megacity where the gods run on electricity.'],
  ['Paper Crane Squadron', 'series', 2018, 25, ['action', 'drama'], ['sub', 'dub'], '16+', 63, 0,
    'Pilots of origami-winged gliders defend the last free sky.'],
  ['Hollow Orchard', 'series', 2022, 10, ['horror', 'mystery'], ['sub'], '16+', 48, 95,
    'Every autumn the orchard bears one fruit too many, and one villager too few.'],
  ['Sunday Spellwork', 'series', 2021, 12, ['slice-of-life', 'fantasy'], ['sub', 'dub'], 'All', 55, 170,
    'Apprentice witches run errands, mostly unsuccessfully, on their only day off.'],
  ['Gearheart Academy', 'series', 2023, 24, ['sci-fi', 'action'], ['sub', 'dub'], '13+', 77, 210,
    'Students build and pilot clockwork titans in a school ranking tournament.'],
  ['Fastball Phantom', 'series', 2020, 24, ['sports', 'comedy'], ['sub'], '13+', 44, 120,
    'A ghost who never got to pitch in the finals possesses the worst player on the team.'],
  ['Midnight Ramen Club', 'series', 2025, 12, ['slice-of-life', 'comedy'], ['sub', 'dub'], 'All', 66, 45,
    'Night-shift workers meet at the same noodle stall and slowly become a family.'],
  ['Echoes Under Glass', 'movie', 2021, null, ['mystery', 'drama'], ['sub'], '13+', 39, 185,
    'A museum restorer hears voices from a sealed display case.'],
  ['Skyward Cartographers', 'series', 2026, 12, ['adventure', 'fantasy'], ['sub'], 'All', 61, 195,
    'Mapmakers chart islands that drift a little further every night.'],
  ['Velvet Encore', 'series', 2022, 12, ['music', 'romance'], ['sub', 'dub'], '13+', 57, 340,
    'A jazz singer and a stagehand keep a failing theatre alive one encore at a time.'],
  ['Ninja Accountant', 'series', 2024, 12, ['comedy', 'action'], ['sub', 'dub'], '13+', 83, 140,
    'The deadliest shinobi alive just wants to finish tax season in peace.'],
  ['Shadow Ninja Requiem', 'movie', 2023, null, ['action', 'drama'], ['sub', 'dub'], '16+', 72, 230,
    'The final mission of a clan that was erased from history.'],
  ['Tidecaller', 'series', 2019, 24, ['fantasy', 'adventure'], ['sub'], '13+', 50, 190,
    'A fisherman’s daughter inherits the power to command the sea, and its debts.'],
  ['Last Train to Kessel Bay', 'movie', 2018, null, ['drama', 'mystery'], ['sub'], '13+', 35, 30,
    'Strangers on an overnight train realise they all received the same letter.'],
  ['Mecha Mochi', 'series', 2026, 12, ['comedy', 'sci-fi'], ['sub', 'dub'], 'All', 79, 330,
    'A sweets shop accidentally builds a giant robot out of rice cake.'],
  ['Bento Battle Royale', 'series', 2024, 12, ['comedy', 'sports'], ['sub', 'dub'], 'All', 68, 55,
    'Competitive lunchbox-making, taken far too seriously.'],
  ['Starlit Archive', 'series', 2025, 24, ['sci-fi', 'mystery'], ['sub'], '13+', 64, 250,
    'A librarian aboard a generation ship finds a book about a planet nobody remembers.'],
  ['Whisper of the Snow Fox', 'movie', 2022, null, ['fantasy', 'romance'], ['sub', 'dub'], 'All', 76, 205,
    'A traveller lost in a blizzard is guided home by a fox who asks for one thing in return.'],
  ['Rival Strings', 'series', 2020, 12, ['music', 'drama'], ['sub'], '13+', 42, 300,
    'Two violin prodigies are forced to share a scholarship, and a practice room.'],
  ['Grave Shift', 'series', 2023, 12, ['horror', 'comedy'], ['sub', 'dub'], '16+', 46, 275,
    'Working nights at a cemetery convenience store has some unusual customers.'],
  ['Snapdragon Sisters', 'series', 2026, 12, ['slice-of-life', 'romance'], ['sub'], 'All', 95, 110,
    'Three sisters inherit a flower shop and a lot of complicated feelings.'],
  ['Moss & Marrow', 'movie', 2025, null, ['fantasy', 'horror'], ['sub'], '16+', 41, 80,
    'A forest that heals any wound, for a price paid in bone.'],
  ['Overclocked Hearts', 'series', 2021, 12, ['romance', 'sci-fi'], ['sub', 'dub'], '13+', 53, 350,
    'An android barista keeps crashing whenever a certain customer smiles.'],
]

export const CATALOG = RAW.map(
  ([title, type, year, episodes, genres, audio, maturity, popularity, hue, synopsis, altTitles = []], i) => ({
    id: `mc-${String(i + 1).padStart(3, '0')}`,
    slug: slugify(title),
    title,
    altTitles,
    type,
    year,
    episodeCount: episodes,
    genres,
    audio,
    maturity,
    popularity,
    hue,
    synopsis,
  }),
)

export const GENRES = genresOf(CATALOG)
