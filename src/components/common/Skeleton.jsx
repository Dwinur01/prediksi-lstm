/**
 * Skeleton loading components shared across pages.
 */

export const SkeletonCard = () => (
  <div className="rounded-md p-6 bg-ink/5 border border-rule space-y-4">
    <div className="w-10 h-10 rounded-md bg-ink/5 " />
    <div className="h-3 w-24 rounded bg-ink/5 " />
    <div className="h-8 w-32 rounded bg-ink/5 " />
  </div>
);

export const SkeletonChart = () => (
  <div className="h-full rounded-md bg-ink/5 relative overflow-hidden">
    <div className="absolute inset-0">
      <div className="absolute bottom-0 left-0 right-0 flex items-end gap-2 px-4 pb-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-ink/5 rounded-t"
            style={{ height: `${20 + Math.sin(i * 0.8) * 30 + 30}%` }}
          />
        ))}
      </div>
    </div>
  </div>
);

export const SkeletonTable = () => (
  <div className=" space-y-3">
    <div className="h-10 bg-ink/5 rounded-md" />
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="h-12 bg-ink/5 rounded-md" />
    ))}
  </div>
);

export const SkeletonRow = () => (
  <tr className="">
    {Array.from({ length: 7 }).map((_, i) => (
      <td key={i} className="px-4 py-4">
        <div className="h-4 bg-ink/5 rounded" style={{ width: `${40 + (i * 17) % 40}px` }} />
      </td>
    ))}
  </tr>
);
