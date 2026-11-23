"use client";

import React from "react";
import { SnackCategory } from "@/types";

interface SnackFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  isAdmin: boolean;
  onAddClick: () => void;
}

const CATEGORIES: { label: string; value: string }[] = [
  { label: "All Categories", value: "" },
  { label: "Sweet 🍫", value: "sweet" },
  { label: "Savoury 🥨", value: "savoury" },
  { label: "Drink 🧃", value: "drink" },
  { label: "Healthy-ish 🥗", value: "healthy-ish" },
];

const STATUSES: { label: string; value: string }[] = [
  { label: "All Stock", value: "" },
  { label: "In Stock", value: "stocked" },
  { label: "Running Low", value: "running_low" },
  { label: "Gone", value: "gone" },
];

export const SnackFilters: React.FC<SnackFiltersProps> = ({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  status,
  onStatusChange,
  isAdmin,
  onAddClick,
}) => {
  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search snacks..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-gray-900"
          />
          <span className="absolute left-3 top-2.5 text-gray-400 text-sm">🔍</span>
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-gray-600 font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Select */}
        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          aria-label="Filter by category"
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        {/* Status Select */}
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          aria-label="Filter by stock status"
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Admin Add Snack Button */}
      {isAdmin && (
        <button
          onClick={onAddClick}
          className="px-4 py-2 bg-gray-900 hover:bg-black text-white font-medium text-sm rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2 shrink-0"
        >
          <span>＋</span> Add Snack
        </button>
      )}
    </div>
  );
};
