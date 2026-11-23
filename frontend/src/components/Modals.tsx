"use client";

import React, { useState } from "react";
import { Snack, SnackCategory } from "@/types";

// ---------- Consume Modal ----------

interface ConsumeModalProps {
  snack: Snack;
  onClose: () => void;
  onConsume: (amount: number) => Promise<void>;
}

export const ConsumeModal: React.FC<ConsumeModalProps> = ({ snack, onClose, onConsume }) => {
  const [amount, setAmount] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || amount > snack.quantity) return;
    setSubmitting(true);
    try {
      await onConsume(amount);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Grab a Snack!</h3>
        <p className="text-sm text-gray-500 mb-4">
          How many packets of <span className="font-semibold text-gray-800">{snack.name}</span> are you taking?
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Amount</span>
              <span>Available: {snack.quantity}</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAmount((a) => Math.max(1, a - 1))}
                className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold text-gray-700 flex items-center justify-center"
              >
                −
              </button>
              <input
                type="number"
                min="1"
                max={Math.max(1, snack.quantity)}
                value={amount}
                onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 text-center font-bold text-lg py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={() => setAmount((a) => Math.min(snack.quantity, a + 1))}
                className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold text-gray-700 flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || snack.quantity === 0}
              className="flex-1 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 rounded-xl transition-colors"
            >
              {submitting ? "Grabbing..." : "Confirm"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


// ---------- Restock Modal (Admin) ----------

interface RestockModalProps {
  snack: Snack;
  onClose: () => void;
  onRestock: (amount: number) => Promise<void>;
}

export const RestockModal: React.FC<RestockModalProps> = ({ snack, onClose, onRestock }) => {
  const [amount, setAmount] = useState<number>(10);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || amount > 1000) return;
    setSubmitting(true);
    try {
      await onRestock(amount);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Restock Pantry</h3>
        <p className="text-sm text-gray-500 mb-4">
          Add fresh stock for <span className="font-semibold text-gray-800">{snack.name}</span>.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Packets to Add</label>
            <input
              type="number"
              min="1"
              max="1000"
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
              className="w-full text-center font-bold text-lg py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-xs text-gray-400 mt-1">Current: {snack.quantity} → New: {snack.quantity + amount}</p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || amount <= 0}
              className="flex-1 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 rounded-xl transition-colors"
            >
              {submitting ? "Restocking..." : "Restock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


// ---------- Add / Edit Snack Modal (Admin) ----------

interface AddEditSnackModalProps {
  snack?: Snack | null;
  onClose: () => void;
  onSave: (data: { name: string; category: SnackCategory; quantity: number; low_stock_threshold: number }) => Promise<void>;
}

export const AddEditSnackModal: React.FC<AddEditSnackModalProps> = ({ snack, onClose, onSave }) => {
  const [name, setName] = useState(snack?.name ?? "");
  const [category, setCategory] = useState<SnackCategory>(snack?.category ?? "sweet");
  const [quantity, setQuantity] = useState(snack?.quantity ?? 10);
  const [threshold, setThreshold] = useState(snack?.low_stock_threshold ?? 5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a snack name.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        category,
        quantity: Math.max(0, quantity),
        low_stock_threshold: Math.max(0, threshold),
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save snack");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4">{snack ? "Edit Snack" : "Add New Snack"}</h3>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-800 text-xs border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Snack Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Masala Peanuts"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as SnackCategory)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-amber-500"
            >
              <option value="sweet">Sweet 🍫</option>
              <option value="savoury">Savoury 🥨</option>
              <option value="drink">Drink 🧃</option>
              <option value="healthy-ish">Healthy-ish 🥗</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Low Stock Alert</label>
              <input
                type="number"
                min="0"
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 text-sm font-semibold text-white bg-gray-900 hover:bg-black rounded-xl transition-colors"
            >
              {submitting ? "Saving..." : "Save Snack"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


// ---------- Delete Confirm Modal (Admin) ----------

interface DeleteModalProps {
  snack: Snack;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const DeleteModal: React.FC<DeleteModalProps> = ({ snack, onClose, onConfirm }) => {
  const [submitting, setSubmitting] = useState(false);

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-gray-100">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xl font-bold mb-3">
          ⚠
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">Delete Snack?</h3>
        <p className="text-sm text-gray-500 mb-4">
          Are you sure you want to delete <span className="font-semibold text-gray-800">{snack.name}</span>? This action cannot be undone.
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className="flex-1 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-300 rounded-xl transition-colors"
          >
            {submitting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};
