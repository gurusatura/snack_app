"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { api, getApiErrorMessage } from "@/lib/api";
import { Snack, StockSummary, SnackOfTheWeek, SnackSummaryResponse, SnackListResponse, SnackCategory, SnackStatus } from "@/types";
import { Navbar } from "./Navbar";
import { SummaryCards } from "./SummaryCards";
import { SnackFilters } from "./SnackFilters";
import { SnackCard } from "./SnackCard";
import { ConsumeModal, RestockModal, AddEditSnackModal, DeleteModal } from "./Modals";

export const DashboardView: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();

  // Data states
  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [snackOfTheWeek, setSnackOfTheWeek] = useState<SnackOfTheWeek | null>(null);
  const [snacks, setSnacks] = useState<Snack[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filter states
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");

  // Loading & error states
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingSnacks, setLoadingSnacks] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal active targets
  const [consumingSnack, setConsumingSnack] = useState<Snack | null>(null);
  const [restockingSnack, setRestockingSnack] = useState<Snack | null>(null);
  const [editingSnack, setEditingSnack] = useState<Snack | null>(null);
  const [deletingSnack, setDeletingSnack] = useState<Snack | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // 1. Fetch Summary
  const fetchSummary = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoadingSummary(true);
      const res = await api.get<SnackSummaryResponse>("/snacks/summary");
      setSummary(res.data.stock_summary);
      setSnackOfTheWeek(res.data.snack_of_the_week);
    } catch (err) {
      console.error("Failed to load summary:", err);
    } finally {
      if (!silent) setLoadingSummary(false);
    }
  }, []);

  // 2. Fetch Snacks
  const fetchSnacks = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoadingSnacks(true);
        setError(null);
        const params = new URLSearchParams();
        if (search.trim()) params.append("search", search.trim());
        if (category) params.append("category", category);
        if (status) params.append("status", status);
        params.append("page", page.toString());
        params.append("limit", "12");

        const res = await api.get<SnackListResponse>(`/snacks?${params.toString()}`);
        setSnacks(res.data.items);
        setTotal(res.data.total);
        setTotalPages(res.data.total_pages);
      } catch (err: unknown) {
        const msg = getApiErrorMessage(err, "Failed to load snacks. Please try again.");
        setError(msg);
      } finally {
        if (!silent) setLoadingSnacks(false);
      }
    },
    [search, category, status, page]
  );

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchSnacks();
  }, [fetchSnacks]);

  // ---------- Action Handlers ----------

  // Consume
  const handleConsume = async (amount: number) => {
    if (!consumingSnack) return;
    try {
      const res = await api.post(`/snacks/${consumingSnack.id}/consume`, { amount });
      const newQty = res.data.remaining_quantity;
      const newStatus: SnackStatus =
        newQty === 0
          ? "gone"
          : newQty <= consumingSnack.low_stock_threshold
          ? "running_low"
          : "stocked";

      // Smooth in-place state update: Zero screen flash, zero skeleton unmount
      setSnacks((prev) =>
        prev.map((s) =>
          s.id === consumingSnack.id
            ? { ...s, quantity: newQty, status: newStatus }
            : s
        )
      );

      showToast(
        `Enjoy your snack! Grabbed ${amount} packet(s). ${newQty} left in pantry.`,
        "success"
      );
      // Silent background refresh to guarantee synchronization
      fetchSnacks(true);
      fetchSummary(true);
    } catch (err: unknown) {
      const msg = getApiErrorMessage(
        err,
        "Someone beat you to the last packet! Not enough stock remaining."
      );
      showToast(msg, "warning");
      fetchSnacks(true);
      fetchSummary(true);
    }
  };

  // Restock (Admin)
  const handleRestock = async (amount: number) => {
    if (!restockingSnack) return;
    try {
      const res = await api.post(`/snacks/${restockingSnack.id}/restock`, { amount });
      const newQty = res.data.new_quantity;
      const newStatus: SnackStatus =
        newQty === 0
          ? "gone"
          : newQty <= restockingSnack.low_stock_threshold
          ? "running_low"
          : "stocked";

      // Smooth in-place state update
      setSnacks((prev) =>
        prev.map((s) =>
          s.id === restockingSnack.id
            ? { ...s, quantity: newQty, status: newStatus }
            : s
        )
      );

      showToast(
        `Restocked! Added ${amount} packet(s). Total now: ${newQty}.`,
        "success"
      );
      fetchSnacks(true);
      fetchSummary(true);
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, "Failed to restock snack.");
      showToast(msg, "error");
    }
  };

  // Vote Toggle
  const handleVoteToggle = async (snack: Snack) => {
    const nextVoted = !snack.user_voted;
    const nextVotesCount = nextVoted ? snack.votes_count + 1 : Math.max(0, snack.votes_count - 1);

    // Optimistic in-place update for instant responsiveness
    setSnacks((prev) =>
      prev.map((s) =>
        s.id === snack.id
          ? { ...s, user_voted: nextVoted, votes_count: nextVotesCount }
          : s
      )
    );

    try {
      if (snack.user_voted) {
        await api.delete(`/snacks/${snack.id}/vote`);
        showToast(`Vote removed for ${snack.name}.`, "info");
      } else {
        await api.post(`/snacks/${snack.id}/vote`);
        showToast(`Voted for ${snack.name}! ❤️`, "success");
      }
      fetchSummary(true);
      fetchSnacks(true);
    } catch (err: unknown) {
      // Revert if request failed
      setSnacks((prev) =>
        prev.map((s) =>
          s.id === snack.id
            ? { ...s, user_voted: snack.user_voted, votes_count: snack.votes_count }
            : s
        )
      );
      const msg = getApiErrorMessage(err, "Vote action failed.");
      showToast(msg, "warning");
    }
  };

  // Add Snack (Admin)
  const handleAddSnack = async (data: {
    name: string;
    category: SnackCategory;
    quantity: number;
    low_stock_threshold: number;
  }) => {
    await api.post("/snacks", data);
    showToast(`Added "${data.name}" to the pantry!`, "success");
    fetchSnacks(false);
    fetchSummary(true);
  };

  // Edit Snack (Admin)
  const handleEditSnack = async (data: {
    name: string;
    category: SnackCategory;
    quantity: number;
    low_stock_threshold: number;
  }) => {
    if (!editingSnack) return;
    const res = await api.patch(`/snacks/${editingSnack.id}`, data);
    setSnacks((prev) =>
      prev.map((s) => (s.id === editingSnack.id ? res.data : s))
    );
    showToast(`Updated "${data.name}".`, "success");
    fetchSummary(true);
  };

  // Delete Snack (Admin)
  const handleDeleteSnack = async () => {
    if (!deletingSnack) return;
    try {
      await api.delete(`/snacks/${deletingSnack.id}`);
      setSnacks((prev) => prev.filter((s) => s.id !== deletingSnack.id));
      showToast(`Deleted "${deletingSnack.name}".`, "success");
      fetchSummary(true);
    } catch (err: unknown) {
      const msg = getApiErrorMessage(
        err,
        "Cannot delete snack with existing activity history."
      );
      showToast(msg, "error");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              Pantry Overview
            </h2>
            <p className="text-sm text-gray-500">
              Live inventory tracking, consumption, and weekly office favourites
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-400 font-medium">
              Logged in as <span className="font-bold text-gray-700">{user?.name}</span>
            </div>
            {isAdmin && (
              <Link
                href="/activity"
                className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
              >
                <span>Activity Log →</span>
              </Link>
            )}
          </div>
        </div>

        {/* Status Summary & Snack of the Week Cards */}
        <SummaryCards
          summary={summary}
          snackOfTheWeek={snackOfTheWeek}
          loading={loadingSummary}
        />

        {/* Filters & Search */}
        <SnackFilters
          search={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          category={category}
          onCategoryChange={(v) => {
            setCategory(v);
            setPage(1);
          }}
          status={status}
          onStatusChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          isAdmin={isAdmin}
          onAddClick={() => setIsAddModalOpen(true)}
        />

        {/* Snack List Grid */}
        {loadingSnacks && snacks.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-56 bg-gray-200/70 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center max-w-md mx-auto my-12">
            <p className="text-red-800 text-sm font-semibold mb-3">{error}</p>
            <button
              onClick={() => fetchSnacks(false)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Retry
            </button>
          </div>
        ) : snacks.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center max-w-md mx-auto my-8 shadow-xs">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="text-base font-bold text-gray-900 mb-1">No snacks found</h3>
            <p className="text-xs text-gray-500 mb-4">
              Try adjusting your search terms or filter selections.
            </p>
            {(search || category || status) && (
              <button
                onClick={() => {
                  setSearch("");
                  setCategory("");
                  setStatus("");
                  setPage(1);
                }}
                className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {snacks.map((snack) => (
                <SnackCard
                  key={snack.id}
                  snack={snack}
                  isAdmin={isAdmin}
                  onConsumeClick={(s) => setConsumingSnack(s)}
                  onVoteToggle={(s) => handleVoteToggle(s)}
                  onRestockClick={(s) => setRestockingSnack(s)}
                  onEditClick={(s) => setEditingSnack(s)}
                  onDeleteClick={(s) => setDeletingSnack(s)}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-4 text-sm">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-gray-700 transition-colors"
                >
                  ← Previous
                </button>
                <span className="text-xs text-gray-500 font-semibold">
                  Page {page} of {totalPages} ({total} snacks)
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-gray-700 transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Action Modals */}
      {consumingSnack && (
        <ConsumeModal
          snack={consumingSnack}
          onClose={() => setConsumingSnack(null)}
          onConsume={handleConsume}
        />
      )}

      {restockingSnack && (
        <RestockModal
          snack={restockingSnack}
          onClose={() => setRestockingSnack(null)}
          onRestock={handleRestock}
        />
      )}

      {isAddModalOpen && (
        <AddEditSnackModal
          onClose={() => setIsAddModalOpen(false)}
          onSave={handleAddSnack}
        />
      )}

      {editingSnack && (
        <AddEditSnackModal
          snack={editingSnack}
          onClose={() => setEditingSnack(null)}
          onSave={handleEditSnack}
        />
      )}

      {deletingSnack && (
        <DeleteModal
          snack={deletingSnack}
          onClose={() => setDeletingSnack(null)}
          onConfirm={handleDeleteSnack}
        />
      )}
    </div>
  );
};
