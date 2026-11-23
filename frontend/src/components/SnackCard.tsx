"use client";

import React from "react";
import { Snack } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Heart, Plus, Edit2, Trash2, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

interface SnackCardProps {
  snack: Snack;
  isAdmin: boolean;
  onConsumeClick: (snack: Snack) => void;
  onVoteToggle: (snack: Snack) => void;
  onRestockClick: (snack: Snack) => void;
  onEditClick: (snack: Snack) => void;
  onDeleteClick: (snack: Snack) => void;
}

// Curated high-resolution food photography verified for exact snack matching
const SNACK_PHOTOS: Record<string, string> = {
  // Masala Peanuts -> Authentic crispy spicy masala coated peanuts with curry leaves
  "Masala Peanuts": "/masala-peanuts.jpg",
  // Dark Chocolate Almonds -> Real dark chocolate blocks and whole almonds
  "Dark Chocolate Almonds": "https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=600&auto=format&fit=crop&q=80",
  // Cold Brew Coffee -> Iced glass of rich cold brew coffee
  "Cold Brew Coffee": "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80",
  // Greek Yogurt Cups -> Fresh yogurt cup with berries and spoon
  "Greek Yogurt Cups": "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&auto=format&fit=crop&q=80",
  // Oat & Honey Granola Bar -> Real golden baked honey oat granola bars
  "Oat & Honey Granola Bar": "/granola-bar.jpg",
  // Sparkling Lime Water -> Sparkling mineral water with sliced fresh green lime
  "Sparkling Lime Water": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80",
  // Sea Salt Potato Crisps -> Real kettle-cooked sea salt potato crisps
  "Sea Salt Potato Crisps": "/potato-crisps.jpg",
  // Matcha Green Tea -> Real whisked ceremonial Japanese matcha bowl
  "Matcha Green Tea": "/matcha-green-tea.jpg",
};

const DEFAULT_PHOTO = "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80";

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
  const photoUrl = SNACK_PHOTOS[snack.name] || DEFAULT_PHOTO;

  return (
    <Card
      className={`overflow-hidden flex flex-col justify-between transition-all duration-200 group hover:shadow-md bg-[#FFFDF9] ${
        isGone
          ? "border-red-200 bg-gradient-to-b from-[#FFFDF9] to-red-50/20"
          : isRunningLow
          ? "border-[#D97706]/40 bg-gradient-to-b from-[#FFFDF9] to-[#FEF3C7]/20"
          : "border-[#E6DFD3] hover:border-[#C2410C]/40"
      }`}
    >
      <div>
        {/* Photo Header with Category & Stock Status Overlays */}
        <div className="relative h-44 w-full bg-[#EFEAE1]/50 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt={snack.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

          {/* Badges Overlaid on Photo */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5 pointer-events-none">
            <Badge variant="outline" className="bg-[#FFFDF9]/95 backdrop-blur-xs text-[#2B1E16] border-[#E6DFD3] capitalize shadow-xs font-bold text-[10px]">
              {snack.category}
            </Badge>

            {isGone ? (
              <Badge variant="destructive" className="font-bold gap-1 shadow-xs text-[10px]">
                <XCircle className="w-3 h-3" />
                <span>Gone</span>
              </Badge>
            ) : isRunningLow ? (
              /* Mustard yellow highlight for running low */
              <Badge className="font-bold gap-1 shadow-xs text-[10px] bg-[#D97706] text-white border-[#B45309] animate-pulse">
                <AlertTriangle className="w-3 h-3" />
                <span>Low ({snack.quantity})</span>
              </Badge>
            ) : (
              /* Deep teal grounding badge for in stock */
              <Badge className="font-bold gap-1 shadow-xs text-[10px] bg-[#16433C] text-[#FAF6F0] border-[#0F312B]">
                <CheckCircle2 className="w-3 h-3" />
                <span>{snack.quantity} in stock</span>
              </Badge>
            )}
          </div>

          {/* Title on Bottom of Image */}
          <div className="absolute bottom-2.5 left-3 right-3 text-white">
            <h3 className="text-base font-extrabold tracking-tight drop-shadow-sm leading-snug line-clamp-1">
              {snack.name}
            </h3>
          </div>
        </div>

        {/* Card Body Info */}
        <div className="p-4">
          <div className="flex items-center justify-between text-[11px] text-[#6E5D53]">
            <span>
              Remaining: <strong className="text-[#2B1E16] font-bold">{snack.quantity}</strong> pkts
            </span>
            <span className="text-[#6E5D53]/70">
              Alert at ≤ {snack.low_stock_threshold}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 pt-0">
        {/* Action Buttons Row */}
        <div className="flex items-center gap-2 pt-3 border-t border-[#E6DFD3]">
          {/* Grab Button — Burnt orange / rust primary action */}
          <Button
            onClick={() => onConsumeClick(snack)}
            disabled={isGone}
            variant={isGone ? "outline" : "default"}
            className="flex-1 gap-1.5 text-xs font-bold shadow-xs"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{isGone ? "Out of Stock" : "Grab 1"}</span>
          </Button>

          {/* Vote Toggle Button */}
          <button
            onClick={() => onVoteToggle(snack)}
            title={snack.user_voted ? "Remove your vote" : "Vote for this snack"}
            className={`h-9 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
              snack.user_voted
                ? "bg-[#FFEDE3] text-[#C2410C] border-[#C2410C]/40 hover:bg-[#FDDCCC] shadow-xs"
                : "bg-[#FAF6F0] text-[#6E5D53] border-[#E6DFD3] hover:bg-[#EFEAE1]"
            }`}
          >
            <Heart
              className={`w-3.5 h-3.5 transition-colors ${
                snack.user_voted ? "fill-[#C2410C] text-[#C2410C]" : "text-[#6E5D53]/60"
              }`}
            />
            <span>{snack.votes_count}</span>
          </button>
        </div>

        {/* Admin Actions Bar (conditionally rendered) */}
        {isAdmin && (
          <div className="flex items-center justify-between gap-1 mt-3 pt-2.5 border-t border-dashed border-[#E6DFD3] text-xs">
            <span className="text-[#3D261D] font-bold text-[10px] uppercase tracking-wider">
              Admin:
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onRestockClick(snack)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#E6F0EE] hover:bg-[#D4E6E3] text-[#16433C] font-bold text-[11px] transition-colors cursor-pointer"
                title="Restock packets"
              >
                <Plus className="w-3 h-3" />
                <span>Restock</span>
              </button>
              <button
                onClick={() => onEditClick(snack)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#EFEAE1] hover:bg-[#E2DAD0] text-[#3D261D] font-bold text-[11px] transition-colors cursor-pointer"
                title="Edit name, category or threshold"
              >
                <Edit2 className="w-3 h-3" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => onDeleteClick(snack)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[11px] transition-colors cursor-pointer"
                title="Delete snack"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
