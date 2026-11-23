"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api, getApiErrorMessage } from "@/lib/api";
import { ActivityItem, ActivityListResponse } from "@/types";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, RotateCw, ArrowLeft, ShieldAlert, Package, Layers } from "lucide-react";

export default function ActivityPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async (targetPage: number) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<ActivityListResponse>(`/activity?page=${targetPage}&limit=15`);
      setActivities(res.data.items);
      setTotal(res.data.total);
      setPage(res.data.page);
      setTotalPages(res.data.total_pages);
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, "Failed to load activity logs.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else if (isAdmin) {
        fetchActivities(page);
      }
    }
  }, [authLoading, user, isAdmin, page, fetchActivities, router]);

  // Auth loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FAF6F0] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#C2410C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Non-admin forbidden state
  if (user && !isAdmin) {
    return (
      <div className="min-h-screen bg-[#FAF6F0] text-[#2B1E16] flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-xl mx-auto px-4 py-16 text-center">
          <Card className="p-8 shadow-xs border-[#E6DFD3] text-center bg-[#FFFDF9]">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold text-xl">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-[#2B1E16] mb-2">Admin Access Required</h2>
            <p className="text-sm text-[#6E5D53] mb-6">
              The pantry activity audit log is restricted to administrative staff only.
            </p>
            <Link href="/">
              <Button variant="default" size="sm">
                ← Return to Pantry
              </Button>
            </Link>
          </Card>
        </main>
      </div>
    );
  }

  const formatTimestamp = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#2B1E16] flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Breadcrumb / Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Link
                href="/"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#6E5D53] hover:text-[#2B1E16] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Pantry</span>
              </Link>
            </div>
            <h2 className="text-2xl font-black text-[#2B1E16] tracking-tight flex items-center gap-2">
              <Clock className="w-6 h-6 text-[#16433C]" />
              <span>Activity Audit Log</span>
            </h2>
            <p className="text-xs text-[#6E5D53] mt-0.5">
              Chronological log of all snack consumption and restock operations
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchActivities(page)}
              disabled={loading}
              className="gap-1.5 shadow-xs"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Main Content Table Card */}
        <Card className="shadow-xs overflow-hidden border-[#E6DFD3] bg-[#FFFDF9]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF6F0] border-b border-[#E6DFD3] text-[#6E5D53] uppercase font-bold tracking-wider text-[11px]">
                <tr>
                  <th scope="col" className="px-5 py-3.5">
                    Timestamp
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    User
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Action
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Snack Item
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right">
                    Quantity
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6DFD3]/60">
                {loading ? (
                  // Skeleton rows
                  [1, 2, 3, 4, 5, 6].map((i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-5 py-4">
                        <div className="h-3 bg-[#EFEAE1] rounded-md w-28" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-3 bg-[#EFEAE1] rounded-md w-32 mb-1" />
                        <div className="h-2.5 bg-[#EFEAE1]/70 rounded-md w-24" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-5 bg-[#EFEAE1] rounded-md w-16" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-3 bg-[#EFEAE1] rounded-md w-36" />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="h-3 bg-[#EFEAE1] rounded-md w-12 ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : activities.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-[#6E5D53]">
                      No activity recorded in the pantry yet.
                    </td>
                  </tr>
                ) : (
                  activities.map((item) => {
                    const isRestock = item.action === "restocked";
                    return (
                      <tr key={item.id} className="hover:bg-[#FAF6F0]/60 transition-colors">
                        <td className="px-5 py-3.5 text-[#6E5D53] font-mono text-[11px] whitespace-nowrap">
                          {formatTimestamp(item.created_at)}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-[#2B1E16]">{item.user_name}</div>
                          <div className="text-[11px] text-[#6E5D53] font-mono">{item.user_email}</div>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <Badge
                            variant={isRestock ? "secondary" : "mustard"}
                            className="text-[10px] uppercase font-bold tracking-wider"
                          >
                            {isRestock ? "+ Restocked" : "− Grabbed"}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 font-bold text-[#2B1E16]">
                          {item.snack_name}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-xs whitespace-nowrap">
                          <span className={isRestock ? "text-[#16433C]" : "text-[#2B1E16]"}>
                            {isRestock ? `+${item.amount}` : `−${item.amount}`}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-5 py-3.5 border-t border-[#E6DFD3] flex items-center justify-between text-xs text-[#6E5D53]">
              <div>
                Showing page <strong className="font-bold text-[#2B1E16]">{page}</strong> of{" "}
                <strong className="font-bold text-[#2B1E16]">{totalPages}</strong>{" "}
                <span className="text-[#6E5D53]">({total} total events)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
