"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api, getApiErrorMessage } from "@/lib/api";
import { ActivityItem, ActivityListResponse } from "@/types";
import { Navbar } from "@/components/Navbar";

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Non-admin forbidden state
  if (user && !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-xl mx-auto px-4 py-16 text-center">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-xs">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold text-xl">
              !
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Admin Access Required</h2>
            <p className="text-sm text-gray-500 mb-6">
              The pantry activity audit log is restricted to administrative staff only.
            </p>
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition-colors"
            >
              ← Return to Pantry
            </Link>
          </div>
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Breadcrumb / Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/"
                className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
              >
                ← Back to Pantry
              </Link>
            </div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              Activity Audit Log
            </h2>
            <p className="text-xs text-gray-500">
              Chronological log of all snack consumption and restock operations
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchActivities(page)}
              disabled={loading}
              className="px-3 py-1.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
            >
              <span className={loading ? "animate-spin" : ""}>↻</span>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Main Content Table Card */}
        <div className="bg-white border border-gray-200/90 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 border-b border-gray-200/80 text-gray-500 uppercase font-bold tracking-wider text-[11px]">
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
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  // Skeleton rows
                  [1, 2, 3, 4, 5, 6].map((i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-5 py-4">
                        <div className="h-3 bg-gray-200 rounded-md w-28" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-3 bg-gray-200 rounded-md w-32 mb-1" />
                        <div className="h-2.5 bg-gray-100 rounded-md w-24" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-5 bg-gray-200 rounded-md w-16" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-3 bg-gray-200 rounded-md w-36" />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="h-3 bg-gray-200 rounded-md w-12 ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : activities.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-gray-400">
                      No activity recorded in the pantry yet.
                    </td>
                  </tr>
                ) : (
                  activities.map((item) => {
                    const isRestock = item.action === "restocked";
                    return (
                      <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-5 py-3.5 text-gray-500 font-mono text-[11px] whitespace-nowrap">
                          {formatTimestamp(item.created_at)}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-gray-900">{item.user_name}</div>
                          <div className="text-[11px] text-gray-400">{item.user_email}</div>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                              isRestock
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-amber-50 text-amber-800 border border-amber-200"
                            }`}
                          >
                            {isRestock ? "+ Restocked" : "− Grabbed"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-medium text-gray-900">
                          {item.snack_name}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-xs whitespace-nowrap">
                          <span className={isRestock ? "text-emerald-700" : "text-gray-900"}>
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
            <div className="px-5 py-3.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <div>
                Showing page <span className="font-semibold text-gray-800">{page}</span> of{" "}
                <span className="font-semibold text-gray-800">{totalPages}</span>{" "}
                <span className="text-gray-400">({total} total events)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                  className="px-3 py-1 bg-white border border-gray-200 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg font-medium text-gray-700 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loading}
                  className="px-3 py-1 bg-white border border-gray-200 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg font-medium text-gray-700 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
