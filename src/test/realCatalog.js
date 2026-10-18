import fs from 'node:fs'
import path from 'node:path'

// Loads the generated public/data files so tests can run against the real catalogue.
const dataDir = path.resolve(__dirname, '../../public/data')

export const INDEX = JSON.parse(fs.readFileSync(path.join(dataDir, 'catalog.json'), 'utf8'))

export const SHOWS = INDEX.shows.map((entry) =>
  JSON.parse(fs.readFileSync(path.join(dataDir, 'shows', `${entry.id}.json`), 'utf8')),
)
