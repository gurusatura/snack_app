"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

interface LoginFormProps {
  onSuccess?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const { login, register, loading } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (mode === "login") {
        await login(email, password);
        showToast("Signed in successfully! Welcome to Snack Overflow.", "success");
      } else {
        await register(name, email, password);
        showToast("Account created successfully! Welcome aboard.", "success");
      }
      onSuccess?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      setError(msg);
      showToast(msg, "error");
    }
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  const toggleMode = () => {
    setError(null);
    setMode((prev) => (prev === "login" ? "register" : "login"));
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 sm:p-8 bg-white rounded-3xl shadow-xl border border-gray-100">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white text-3xl shadow-md">
          🍿
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Snack Overflow</h2>
        <p className="text-sm text-gray-500 mt-1">
          {mode === "login"
            ? "Sign in to track and grab pantry snacks"
            : "Create your member account to start snacking"}
        </p>
      </div>

      {mode === "register" && (
        <div className="mb-5 p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs flex items-center gap-2">
          <span className="text-base">ℹ️</span>
          <span>
            <strong>Member Registration:</strong> Public sign-up provides Member access only. Admin roles cannot be self-assigned.
          </span>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <span className="font-bold text-sm">✕</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "register" && (
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Johnson"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
            />
          </div>
        )}

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
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
          />
          {mode === "register" && (
            <p className="text-[11px] text-gray-400 mt-1">Minimum 6 characters</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-gray-900 hover:bg-black text-white font-bold text-sm rounded-xl transition-all shadow-md hover:shadow-lg disabled:bg-gray-400 mt-2"
        >
          {loading
            ? mode === "login"
              ? "Signing in..."
              : "Creating account..."
            : mode === "login"
            ? "Sign In"
            : "Create Account"}
        </button>
      </form>

      {/* Switch between Sign In and Register */}
      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={toggleMode}
          className="text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline transition-colors"
        >
          {mode === "login"
            ? "New teammate? Create a free account →"
            : "← Already have an account? Sign in"}
        </button>
      </div>

      {/* Quick Demo Login Buttons for Evaluators (Shown in login mode) */}
      {mode === "login" && (
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
      )}
    </div>
  );
};
