export default function LoadingSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="panel overflow-hidden p-4">
      <div className="flex flex-col gap-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={`skeleton-row-${rowIndex}`}
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: cols }).map((__, colIndex) => (
              <div key={`skeleton-cell-${rowIndex}-${colIndex}`} className="skeleton h-10 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
