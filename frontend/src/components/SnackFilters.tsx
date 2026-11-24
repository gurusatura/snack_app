"use client";

import React from "react";
import { Search, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface SnackFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  sort: string;
  onSortChange: (value: string) => void;
  isAdmin: boolean;
  onAddClick: () => void;
}

const CATEGORIES: { label: string; value: string }[] = [
  { label: "All Categories", value: "" },
  { label: "Sweet", value: "sweet" },
  { label: "Savoury", value: "savoury" },
  { label: "Drinks", value: "drink" },
  { label: "Healthy-ish", value: "healthy-ish" },
];

const STATUSES: { label: string; value: string }[] = [
  { label: "All Stock Levels", value: "" },
  { label: "In Stock", value: "stocked" },
  { label: "Running Low", value: "running_low" },
  { label: "Gone", value: "gone" },
];

const SORT_OPTIONS: { label: string; value: string }[] = [
  { label: "Default Order", value: "" },
  { label: "Name: A → Z", value: "name_asc" },
  { label: "Name: Z → A", value: "name_desc" },
  { label: "Quantity: Low → High", value: "quantity_asc" },
  { label: "Quantity: High → Low", value: "quantity_desc" },
  { label: "Most Popular (Highest Votes)", value: "votes_desc" },
];

export const SnackFilters: React.FC<SnackFiltersProps> = ({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  status,
  onStatusChange,
  sort,
  onSortChange,
  isAdmin,
  onAddClick,
}) => {
  return (
    <Card className="p-4 mb-6 shadow-xs border-[#E6DFD3] bg-[#FFFDF9]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search snacks by name..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-[#FAF6F0] border border-[#E6DFD3] rounded-xl text-xs text-[#2B1E16] placeholder:text-[#6E5D53]/70 focus:outline-hidden focus:ring-2 focus:ring-[#C2410C] focus:bg-white transition-all"
            />
            <Search className="w-4 h-4 text-[#6E5D53]/70 absolute left-3 top-2.5 pointer-events-none" />
            {search && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-2.5 text-[#6E5D53] hover:text-[#2B1E16] p-0.5 rounded cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Select */}
          <div className="relative">
            <select
              value={category}
              onChange={(e) => onCategoryChange(e.target.value)}
              aria-label="Filter by category"
              className="w-full sm:w-auto px-3 py-2 bg-[#FAF6F0] border border-[#E6DFD3] rounded-xl text-xs font-medium text-[#2B1E16] focus:outline-hidden focus:ring-2 focus:ring-[#C2410C] focus:bg-white transition-all cursor-pointer"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Select */}
          <div className="relative">
            <select
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
              aria-label="Filter by stock status"
              className="w-full sm:w-auto px-3 py-2 bg-[#FAF6F0] border border-[#E6DFD3] rounded-xl text-xs font-medium text-[#2B1E16] focus:outline-hidden focus:ring-2 focus:ring-[#C2410C] focus:bg-white transition-all cursor-pointer"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Select */}
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => onSortChange(e.target.value)}
              aria-label="Sort snacks order"
              className="w-full sm:w-auto px-3 py-2 bg-[#FAF6F0] border border-[#E6DFD3] rounded-xl text-xs font-medium text-[#2B1E16] focus:outline-hidden focus:ring-2 focus:ring-[#C2410C] focus:bg-white transition-all cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Admin Add Snack Button — Coffee brown accent */}
        {isAdmin && (
          <Button
            onClick={onAddClick}
            variant="secondary"
            className="shrink-0 gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Snack</span>
          </Button>
        )}
      </div>
    </Card>
  );
};
