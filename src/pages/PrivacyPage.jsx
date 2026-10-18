import { useDocumentTitle } from '../hooks/useDocumentTitle.js'

// Keep this accurate whenever the site changes (e.g. adding analytics or accounts).
const CONTACT_EMAIL = null // TODO: set a contact address before launch

export default function PrivacyPage() {
  useDocumentTitle('Privacy')
  return (
    <main className="page prose">
      <h1>Privacy</h1>
      <p>Last updated: October 2026.</p>

      <h2>What this site collects</h2>
      <p>
        munch &amp; crunch has no accounts, no analytics and no advertising, and it sets no cookies of its own.
        Your searches and filters live only in the page address and are not sent to us.
      </p>

      <h2>YouTube</h2>
      <p>
        Episodes play in YouTube’s embedded player, using its privacy-enhanced mode
        (<code>youtube-nocookie.com</code>). YouTube does not set cookies until you press play; once you do,
        YouTube and Google may collect information under the{' '}
        <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Google Privacy Policy</a>.
        Episode thumbnails are loaded from YouTube’s image servers, which can see your IP address.
      </p>

      <h2>Hosting</h2>
      <p>
        The site is hosted on Vercel, which processes standard request information such as IP addresses to deliver
        pages and protect against abuse. See the{' '}
        <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noreferrer">Vercel Privacy Policy</a>.
      </p>

      <h2>Show information</h2>
      <p>
        Titles, genres and descriptions come from <a href="https://anilist.co" target="_blank" rel="noreferrer">AniList</a>;
        videos belong to the official channels that publish them. Neither receives any data about you from this site.
      </p>

      {CONTACT_EMAIL && (
        <>
          <h2>Contact</h2>
          <p>Questions or removal requests: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
        </>
      )}
    </main>
  )
}
