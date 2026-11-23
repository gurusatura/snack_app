"use client";

import React from "react";
import { Snack } from "@/types";

interface SnackCardProps {
  snack: Snack;
  isAdmin: boolean;
  onConsumeClick: (snack: Snack) => void;
  onVoteToggle: (snack: Snack) => void;
  onRestockClick: (snack: Snack) => void;
  onEditClick: (snack: Snack) => void;
  onDeleteClick: (snack: Snack) => void;
}

export const SnackCard: React.FC<SnackCardProps> = ({
  snack,
  isAdmin,
  onConsumeClick,
  onVoteToggle,
  onRestockClick,
  onEditClick,
  onDeleteClick,
}) => {
  const isGone = snack.status === "gone";
  const isRunningLow = snack.status === "running_low";

  // Category emoji lookup
  const categoryEmoji: Record<string, string> = {
    sweet: "🍫",
    savoury: "🥨",
    drink: "🧃",
    "healthy-ish": "🥗",
  };

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 bg-white p-5 flex flex-col justify-between shadow-xs hover:shadow-md ${
        isGone
          ? "border-red-200/90 bg-gradient-to-b from-white to-red-50/20"
          : isRunningLow
          ? "border-amber-300 bg-gradient-to-b from-white to-amber-50/20"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div>
        {/* Top Badges Row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 capitalize">
            <span>{categoryEmoji[snack.category] || "🍿"}</span>
            {snack.category}
          </span>

          {/* Stock Status Badge */}
          {isGone ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
              ● Gone
            </span>
          ) : isRunningLow ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
              ▲ Running Low ({snack.quantity})
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              ✓ In Stock ({snack.quantity})
            </span>
          )}
        </div>

        {/* Snack Name */}
        <h3 className="text-lg font-bold text-gray-900 tracking-tight leading-snug mb-1">
          {snack.name}
        </h3>

        {/* Threshold note */}
        <p className="text-xs text-gray-400 mb-4">
          Stock: <span className="font-semibold text-gray-700">{snack.quantity}</span> packets{" "}
          <span className="text-gray-300">|</span> alert at ≤ {snack.low_stock_threshold}
        </p>
      </div>

      <div>
        {/* Action Buttons Row */}
        <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
          {/* Consume Button */}
          <button
            onClick={() => onConsumeClick(snack)}
            disabled={isGone}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
              isGone
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : isRunningLow
                ? "bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                : "bg-gray-900 hover:bg-black text-white shadow-xs"
            }`}
          >
            {isGone ? "Out of Stock" : "Grab"}
          </button>

          {/* Vote Toggle Button */}
          <button
            onClick={() => onVoteToggle(snack)}
            title={snack.user_voted ? "Remove your vote" : "Vote for this snack"}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
              snack.user_voted
                ? "bg-rose-50 text-rose-600 border-rose-300 hover:bg-rose-100"
                : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
            }`}
          >
            <span className="text-sm">{snack.user_voted ? "❤️" : "🤍"}</span>
            <span>{snack.votes_count}</span>
          </button>
        </div>

        {/* Admin Actions Bar (conditionally rendered) */}
        {isAdmin && (
          <div className="flex items-center justify-between gap-1 mt-3 pt-2 border-t border-dashed border-purple-100 text-xs">
            <span className="text-purple-600 font-bold text-[11px] uppercase tracking-wider">Admin:</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onRestockClick(snack)}
                className="px-2 py-1 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium"
              >
                + Restock
              </button>
              <button
                onClick={() => onEditClick(snack)}
                className="px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium"
              >
                Edit
              </button>
              <button
                onClick={() => onDeleteClick(snack)}
                className="px-2 py-1 rounded-md bg-red-50 hover:bg-red-100 text-red-600 font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
