/**
 * Skeleton loading components shared across pages.
 */

export const SkeletonStatCard = () => (
  <div className="stat-card animate-pulse">
    <div className="flex items-start justify-between">
      <div className="h-3 w-24 bg-rule rounded-full" />
      <div className="w-8 h-8 rounded-xl bg-rule" />
    </div>
    <div className="h-8 w-20 bg-rule rounded-lg mt-2" />
    <div className="h-3 w-28 bg-rule rounded-full" />
  </div>
);

export const SkeletonCard = () => (
  <div className="bg-surface border border-rule rounded-2xl p-6 animate-pulse space-y-4">
    <div className="h-4 w-32 bg-rule rounded-full" />
    <div className="h-8 w-20 bg-rule rounded-lg" />
    <div className="h-3 w-24 bg-rule rounded-full" />
  </div>
);

export const SkeletonChart = () => (
  <div className="bg-surface border border-rule rounded-2xl p-6 animate-pulse">
    <div className="h-4 w-40 bg-rule rounded-full mb-2" />
    <div className="h-3 w-56 bg-rule rounded-full mb-6" />
    <div className="h-[280px] bg-rule/50 rounded-xl relative overflow-hidden">
      <div className="absolute inset-0 flex items-end gap-1 px-6 pb-6">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-rule rounded-t-sm"
            style={{ height: `${25 + Math.sin(i * 0.6) * 25 + 25}%` }}
          />
        ))}
      </div>
    </div>
  </div>
);

export const SkeletonTable = () => (
  <div className="bg-surface border border-rule rounded-2xl p-6 animate-pulse space-y-3">
    <div className="h-4 w-32 bg-rule rounded-full mb-4" />
    <div className="h-10 bg-rule/50 rounded-xl" />
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="h-12 bg-rule/30 rounded-xl" />
    ))}
  </div>
);

export const SkeletonRow = () => (
  <tr>
    {Array.from({ length: 7 }).map((_, i) => (
      <td key={i} className="px-4 py-4">
        <div
          className="h-4 bg-rule rounded-full animate-pulse"
          style={{ width: `${40 + (i * 17) % 40}px` }}
        />
      </td>
    ))}
  </tr>
);
