import AnimeCard, { CardSkeleton } from './AnimeCard.jsx'

export default function ResultsGrid({ items, loading, skeletonCount = 12 }) {
  return (
    <div className="grid" aria-busy={loading}>
      {loading
        ? Array.from({ length: skeletonCount }, (_, i) => <CardSkeleton key={i} />)
        : items.map((item) => <AnimeCard key={item.id} item={item} />)}
    </div>
  )
}
