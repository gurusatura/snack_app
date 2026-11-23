"use client";

import React from "react";
import { StockSummary, SnackOfTheWeek } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle, Trophy, Sparkles } from "lucide-react";

interface SummaryCardsProps {
  summary: StockSummary | null;
  snackOfTheWeek: SnackOfTheWeek | null;
  loading: boolean;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary, snackOfTheWeek, loading }) => {
  if (loading && !summary) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-[#EFEAE1]/70 rounded-2xl animate-pulse border border-[#E6DFD3]" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Stocked Card — Deep teal grounding */}
      <Card className="hover:border-[#16433C]/40 transition-all hover:shadow-xs border-[#E6DFD3] bg-[#FFFDF9]">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#6E5D53] mb-1">Stocked</p>
            <p className="text-3xl font-black text-[#16433C] tracking-tight">{summary?.stocked ?? 0}</p>
            <p className="text-[11px] text-[#6E5D53]/80 mt-1">Above low threshold</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#E6F0EE] text-[#16433C] border border-[#16433C]/20 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </CardContent>
      </Card>

      {/* Running Low Card — Mustard yellow highlight */}
      <Card className="border-[#D97706]/35 bg-gradient-to-br from-[#FFFDF9] to-[#FEF3C7]/25 hover:border-[#D97706]/60 transition-all hover:shadow-xs">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#92400E] mb-1">Running Low</p>
            <p className="text-3xl font-black text-[#B45309] tracking-tight">{summary?.running_low ?? 0}</p>
            <p className="text-[11px] text-[#92400E]/80 mt-1">At or below threshold</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#FEF3C7] text-[#92400E] border border-[#D97706]/30 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
        </CardContent>
      </Card>

      {/* Gone Card — Deep muted rust */}
      <Card className="border-red-200 bg-gradient-to-br from-[#FFFDF9] to-red-50/30 hover:border-red-300 transition-all hover:shadow-xs">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-red-900 mb-1">Gone</p>
            <p className="text-3xl font-black text-red-700 tracking-tight">{summary?.gone ?? 0}</p>
            <p className="text-[11px] text-red-700/80 mt-1">0 packets remaining</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-700 border border-red-200 flex items-center justify-center">
            <XCircle className="w-6 h-6" />
          </div>
        </CardContent>
      </Card>

      {/* Snack of the Week Hero Card — Burnt orange/rust to coffee brown with mustard yellow highlight */}
      <Card className="bg-gradient-to-br from-[#C2410C] via-[#9A3412] to-[#3D261D] text-white border-transparent shadow-xs overflow-hidden relative">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
        <CardContent className="p-5 flex items-center justify-between relative z-10">
          <div className="overflow-hidden pr-2">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[#FEF3C7]" />
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#FEF3C7]">Snack of the Week</p>
            </div>
            {snackOfTheWeek ? (
              <>
                <p className="text-base font-extrabold truncate text-white" title={snackOfTheWeek.name}>
                  {snackOfTheWeek.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {/* Mustard yellow badge for highlight */}
                  <Badge className="bg-[#FEF3C7] text-[#92400E] border-transparent text-[10px] font-bold shadow-xs">
                    {snackOfTheWeek.votes} votes this week
                  </Badge>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-white/90">No votes yet</p>
                <p className="text-[11px] text-[#FEF3C7] mt-0.5">Vote to set the spotlight!</p>
              </>
            )}
          </div>
          <div className="w-11 h-11 shrink-0 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white border border-white/20">
            <Trophy className="w-6 h-6 text-[#FEF3C7]" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
