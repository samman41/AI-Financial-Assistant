import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

const MetricCard = ({ title, value, change, changeText = "MoM", type = "neutral", icon: Icon }) => {
  const isPositive = type === "increase";
  const isNegative = type === "decrease";

  return (
    <div className="glass-card rounded-xl p-6 transition-all duration-300 hover:shadow-premium-hover hover:-translate-y-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</span>
        {Icon && (
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-primary-600 dark:text-primary-400">
            <Icon size={18} />
          </div>
        )}
      </div>
      
      <div className="mt-4">
        <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {value}
        </h3>
        
        {change !== undefined && (
          <div className="flex items-center mt-2 text-xs font-semibold">
            {isPositive && (
              <span className="flex items-center text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full">
                <ArrowUpRight size={14} className="mr-0.5" />
                {change}%
              </span>
            )}
            {isNegative && (
              <span className="flex items-center text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded-full">
                <ArrowDownRight size={14} className="mr-0.5" />
                {change}%
              </span>
            )}
            {type === "neutral" && (
              <span className="text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                {change}%
              </span>
            )}
            <span className="ml-2 text-slate-400 dark:text-slate-500">{changeText}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
