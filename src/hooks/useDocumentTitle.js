import { useEffect } from 'react'

const SITE = 'munch & crunch'

// Sets the browser tab title; pass null while data is loading to keep the site name.
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE}` : SITE
  }, [title])
}
