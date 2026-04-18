export default function ReviewSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="bg-white rounded-xl border border-neutral-200 p-5 animate-pulse"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-neutral-200 rounded w-32" />
              <div className="h-3 bg-neutral-200 rounded w-24" />
              <div className="h-3 bg-neutral-200 rounded w-full mt-3" />
              <div className="h-3 bg-neutral-200 rounded w-4/5" />
            </div>
            <div className="h-8 w-28 bg-neutral-200 rounded-lg shrink-0" />
          </div>
        </div>
      ))}
    </div>
  )
}
