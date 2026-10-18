export const thumbnail = (videoId, size = 'mqdefault') => `https://i.ytimg.com/vi/${videoId}/${size}.jpg`

// youtube-nocookie avoids YouTube setting cookies until the viewer presses play.
export function embedUrl(videoId) {
  const params = new URLSearchParams({ autoplay: '1', rel: '0', modestbranding: '1' })
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params}`
}

export const watchOnYouTube = (videoId, playlistId) => `https://www.youtube.com/watch?v=${videoId}&list=${playlistId}`
export const playlistUrl = (playlistId) => `https://www.youtube.com/playlist?list=${playlistId}`
