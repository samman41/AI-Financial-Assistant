import React from 'react';

export const Loader = ({ className = "h-8 w-8 text-primary-600" }) => (
  <div className="flex justify-center items-center py-8">
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  </div>
);

export const DashboardSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    {/* KPI cards skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-6 h-28 border border-slate-200/50 dark:border-slate-800/40"></div>
      ))}
    </div>

    {/* Charts and details */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-slate-100 dark:bg-slate-800/50 rounded-xl p-6 h-96 border border-slate-200/50 dark:border-slate-800/40"></div>
      <div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-6 h-96 border border-slate-200/50 dark:border-slate-800/40"></div>
    </div>

    {/* Transactions summary skeleton */}
    <div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-6 h-64 border border-slate-200/50 dark:border-slate-800/40"></div>
  </div>
);

export const TableSkeleton = ({ rows = 5, cols = 6 }) => (
  <div className="space-y-4 animate-pulse">
    <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
    {[...Array(rows)].map((_, rIdx) => (
      <div key={rIdx} className="flex gap-4">
        {[...Array(cols)].map((_, cIdx) => (
          <div key={cIdx} className="h-8 bg-slate-100 dark:bg-slate-800/60 rounded flex-1"></div>
        ))}
      </div>
    ))}
  </div>
);
