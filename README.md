# munch & crunch

Search, browse and watch anime that licensors publish **free and officially** on YouTube
(Muse Asia, Muse India, Ani-One, GUNDAM, Toei, TOHO, KADOKAWA, Aniplex, Crunchyroll, Netflix Anime,
RetroCrush, VIZ…). Videos play in YouTube's embedded player; this site hosts no video.

```powershell
npm install
npm run dev     # http://localhost:5173
npm test        # unit + UI tests
```

## Syncing the catalogue

`npm run sync` scans every channel in `scripts/sync/channels.json`, keeps playlists that contain
full episodes (skipping trailers, clips and non-English-subtitled copies), matches each show on
[AniList](https://anilist.co) for genres, year and description, and writes `public/data/`.

1. **Get a free YouTube Data API key** (no billing needed):
   1. Open <https://console.cloud.google.com/>, create a project.
   2. *APIs & Services → Library →* enable **YouTube Data API v3**.
   3. *APIs & Services → Credentials → Create credentials → API key.*
      Restrict it to the YouTube Data API v3.
2. Copy `.env.example` to `.env.local` and paste the key after `YOUTUBE_API_KEY=`.
   `.env.local` is git-ignored; never commit it or put it in front-end code.
3. Run:

```powershell
npm run sync                       # all enabled channels
npm run sync -- --region=IN        # drop episodes blocked in your country
npm run sync -- --only=muse-india  # one channel (keys are in channels.json)
```

The free quota is 10,000 units a day; a full sync uses roughly a few thousand. If a run hits the
limit it stops **without** changing the catalogue; run it again the next day and cached responses
(`scripts/sync/.cache`, kept 3 days) are reused.

## Deploying to Vercel

`vercel.json` already configures the build (`dist/`), page-refresh routing for every
route, caching, and security headers that only allow YouTube's player and thumbnails.

1. Push this repository to GitHub.
2. On <https://vercel.com/new>, import the repository and keep the detected settings; click **Deploy**.
   No environment variables are needed: the site is static and never sees the API key.

### Weekly catalogue refresh

`.github/workflows/sync-catalogue.yml` re-runs the sync every Monday and commits any
changes, which makes Vercel redeploy. In the GitHub repository go to
*Settings → Secrets and variables → Actions → New repository secret*, name it
`YOUTUBE_API_KEY` and paste your key. Run it once by hand from the *Actions* tab to check it.

To add a channel, append it to `channels.json` with its `UC…` channel ID. Only add channels run by
the rights holder. Hand-written synopses or titles can be pinned in `scripts/sync/overrides.json`.
