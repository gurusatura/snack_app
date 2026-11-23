"use client";

import React from "react";
import { StockSummary, SnackOfTheWeek } from "@/types";

interface SummaryCardsProps {
  summary: StockSummary | null;
  snackOfTheWeek: SnackOfTheWeek | null;
  loading: boolean;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary, snackOfTheWeek, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Stocked Card */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Stocked</p>
          <p className="text-3xl font-extrabold text-emerald-600">{summary?.stocked ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">Above low threshold</p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl font-bold">
          ✓
        </div>
      </div>

      {/* Running Low Card */}
      <div className="bg-white p-5 rounded-2xl border border-amber-200/80 shadow-xs flex items-center justify-between bg-gradient-to-br from-white to-amber-50/30">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-1">Running Low</p>
          <p className="text-3xl font-extrabold text-amber-600">{summary?.running_low ?? 0}</p>
          <p className="text-xs text-amber-600/80 mt-1">At or below threshold</p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-xl font-bold">
          ⚠
        </div>
      </div>

      {/* Gone Card */}
      <div className="bg-white p-5 rounded-2xl border border-red-200/80 shadow-xs flex items-center justify-between bg-gradient-to-br from-white to-red-50/30">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-red-700 mb-1">Gone</p>
          <p className="text-3xl font-extrabold text-red-600">{summary?.gone ?? 0}</p>
          <p className="text-xs text-red-600/80 mt-1">0 packets remaining</p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-red-100 text-red-700 flex items-center justify-center text-xl font-bold">
          ✕
        </div>
      </div>

      {/* Snack of the Week Card */}
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white p-5 rounded-2xl shadow-sm flex items-center justify-between">
        <div className="overflow-hidden pr-2">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm">⭐</span>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-100">Snack of the Week</p>
          </div>
          {snackOfTheWeek ? (
            <>
              <p className="text-lg font-extrabold truncate text-white" title={snackOfTheWeek.name}>
                {snackOfTheWeek.name}
              </p>
              <p className="text-xs text-amber-100 mt-0.5">{snackOfTheWeek.votes} votes this week</p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-white/90">No votes yet</p>
              <p className="text-xs text-amber-100 mt-0.5">Vote to set the spotlight!</p>
            </>
          )}
        </div>
        <div className="w-11 h-11 shrink-0 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-xl">
          👑
        </div>
      </div>
    </div>
  );
};
