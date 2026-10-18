function hash(text) {
  let h = 2166136261
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return h >>> 0
}

// Procedurally generated artwork so the project ships no third-party images.
export default function Poster({ item, className = '' }) {
  const { hue, id, title } = item
  const seed = hash(id)
  const initials = title
    .replace(/^The\s+/i, '')
    .split(/\s+/)
    .filter((w) => /^[a-z]/i.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
  const gradientId = `poster-${id}`

  return (
    <svg className={`poster ${className}`} viewBox="0 0 200 300" preserveAspectRatio="xMidYMid slice"
      aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={`hsl(${hue} 70% 58%)`} />
          <stop offset="1" stopColor={`hsl(${(hue + 50) % 360} 55% 16%)`} />
        </linearGradient>
      </defs>
      <rect width="200" height="300" fill={`url(#${gradientId})`} />
      <circle cx={40 + (seed % 120)} cy={60 + ((seed >> 3) % 100)} r={45 + (seed % 40)}
        fill={`hsl(${(hue + 180) % 360} 85% 75% / 0.22)`} />
      <circle cx={160 - ((seed >> 5) % 90)} cy={120 + ((seed >> 7) % 80)} r={18 + ((seed >> 2) % 20)}
        fill="hsl(0 0% 100% / 0.12)" />
      <path d={`M0 ${215 + (seed % 40)} Q100 ${165 + ((seed >> 2) % 60)} 200 ${205 + ((seed >> 4) % 50)} V300 H0Z`}
        fill="hsl(0 0% 0% / 0.38)" />
      <text x="16" y="280" fontSize="46" fontWeight="800" fill="white" opacity="0.92"
        fontFamily="system-ui, sans-serif">{initials}</text>
    </svg>
  )
}
