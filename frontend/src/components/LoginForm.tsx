"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

interface LoginFormProps {
  onSuccess?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const { login, loading } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      showToast("Signed in successfully! Welcome to Snack Overflow.", "success");
      onSuccess?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid credentials";
      setError(msg);
      showToast(msg, "error");
    }
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 sm:p-8 bg-white rounded-3xl shadow-xl border border-gray-100">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white text-3xl shadow-md">
          🍿
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Snack Overflow</h2>
        <p className="text-sm text-gray-500 mt-1">Sign in to track and grab pantry snacks</p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <span className="font-bold text-sm">✕</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-gray-900 hover:bg-black text-white font-bold text-sm rounded-xl transition-all shadow-md hover:shadow-lg disabled:bg-gray-400 mt-2"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      {/* Quick Demo Login Buttons for Evaluators */}
      <div className="mt-8 pt-6 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-center mb-3">
          Quick Demo Accounts (Evaluation)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleQuickLogin("admin@snackoverflow.local", "AdminPassword123!")}
            className="px-2.5 py-2 text-xs font-medium rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors border border-purple-200 text-center"
          >
            👑 Admin
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin("member1@snackoverflow.local", "Member1Password123!")}
            className="px-2.5 py-2 text-xs font-medium rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200 text-center"
          >
            👤 Member 1
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin("member2@snackoverflow.local", "Member2Password123!")}
            className="px-2.5 py-2 text-xs font-medium rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200 text-center"
          >
            👤 Member 2
          </button>
        </div>
      </div>
    </div>
  );
};
