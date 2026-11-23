"use client";

import React, { useState } from "react";
import { Snack, SnackCategory } from "@/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Minus, AlertTriangle, Package, Check, Trash2 } from "lucide-react";

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
    <Dialog
      isOpen={true}
      onClose={onClose}
      title="Grab a Snack!"
      description={`How many packets of ${snack.name} are you taking?`}
    >
      <form onSubmit={handleSubmit}>
        <div className="mb-5 bg-amber-50/50 p-4 rounded-xl border border-amber-900/10">
          <div className="flex items-center justify-between text-xs text-stone-600 mb-2 font-medium">
            <span>Packets to take</span>
            <span className="font-bold text-stone-900">Available: {snack.quantity}</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setAmount((a) => Math.max(1, a - 1))}
              className="h-10 w-10 text-stone-700"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <input
              type="number"
              min="1"
              max={Math.max(1, snack.quantity)}
              value={amount}
              onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 1))}
              className="flex-1 text-center font-black text-xl py-2 bg-white border border-amber-900/15 rounded-xl text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500 shadow-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setAmount((a) => Math.min(snack.quantity, a + 1))}
              className="h-10 w-10 text-stone-700"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="default"
            disabled={submitting || snack.quantity === 0}
            className="flex-1 shadow-xs"
          >
            {submitting ? "Grabbing..." : "Confirm Grab"}
          </Button>
        </div>
      </form>
    </Dialog>
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
    <Dialog
      isOpen={true}
      onClose={onClose}
      title="Restock Pantry"
      description={`Add fresh stock for ${snack.name}.`}
    >
      <form onSubmit={handleSubmit}>
        <div className="mb-5 bg-purple-50/50 p-4 rounded-xl border border-purple-200/60">
          <label className="block text-xs font-bold text-purple-900 mb-1.5">Packets to Add</label>
          <input
            type="number"
            min="1"
            max="1000"
            value={amount}
            onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
            className="w-full text-center font-black text-xl py-2 bg-white border border-purple-200 rounded-xl text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 shadow-xs"
          />
          <p className="text-xs text-purple-700/80 mt-2 font-medium">
            Current: <strong className="text-stone-900">{snack.quantity}</strong> → New:{" "}
            <strong className="text-purple-900">{snack.quantity + (isNaN(amount) ? 0 : amount)}</strong> packets
          </p>
        </div>

        <div className="flex gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting || amount <= 0}
            className="flex-1 bg-purple-700 hover:bg-purple-800 text-white shadow-xs"
          >
            {submitting ? "Restocking..." : "Restock Pantry"}
          </Button>
        </div>
      </form>
    </Dialog>
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
    <Dialog
      isOpen={true}
      onClose={onClose}
      title={snack ? "Edit Snack Details" : "Add New Snack to Pantry"}
      description="Configure snack identity, category, and automatic stock alerts."
    >
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-800 text-xs border border-rose-200 font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">Snack Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Masala Peanuts"
            className="w-full px-3 py-2 bg-amber-50/40 border border-amber-900/15 rounded-xl text-xs text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as SnackCategory)}
            className="w-full px-3 py-2 bg-amber-50/40 border border-amber-900/15 rounded-xl text-xs text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white cursor-pointer font-medium"
          >
            <option value="sweet">Sweet</option>
            <option value="savoury">Savoury</option>
            <option value="drink">Drink</option>
            <option value="healthy-ish">Healthy-ish</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">Current Quantity</label>
            <input
              type="number"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-amber-50/40 border border-amber-900/15 rounded-xl text-xs text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">Low-Stock Alert Threshold</label>
            <input
              type="number"
              min="0"
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-amber-50/40 border border-amber-900/15 rounded-xl text-xs text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
            />
          </div>
        </div>

        <div className="flex gap-2.5 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="default"
            disabled={submitting}
            className="flex-1 shadow-xs"
          >
            {submitting ? "Saving..." : "Save Snack"}
          </Button>
        </div>
      </form>
    </Dialog>
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
    <Dialog
      isOpen={true}
      onClose={onClose}
      title="Delete Snack?"
      description={`Are you sure you want to delete "${snack.name}"? This action cannot be undone.`}
    >
      <div className="p-4 mb-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
        <p className="text-xs text-rose-800 font-medium">
          If this snack has activity history, it is preserved for audit safety.
        </p>
      </div>

      <div className="flex gap-2.5">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={submitting}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={handleDelete}
          disabled={submitting}
          className="flex-1 shadow-xs gap-1.5"
        >
          <Trash2 className="w-4 h-4" />
          <span>{submitting ? "Deleting..." : "Delete Permanently"}</span>
        </Button>
      </div>
    </Dialog>
  );
};
