"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Cookie, Shield, User, Mail, Lock, Sparkles, ArrowRight, ArrowLeft, AlertCircle } from "lucide-react";

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
    <Card className="w-full max-w-md mx-auto shadow-sm border-[#E6DFD3] bg-[#FFFDF9]">
      <CardHeader className="text-center pb-4">
        {/* Deep forest teal brand container */}
        <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-[#16433C] flex items-center justify-center text-[#FAF6F0] shadow-xs">
          <Cookie className="w-9 h-9" />
        </div>
        <CardTitle className="text-2xl font-black text-[#2B1E16] tracking-tight">
          Snack Overflow
        </CardTitle>
        <CardDescription className="text-xs text-[#6E5D53]">
          {mode === "login"
            ? "Sign in to track and grab pantry snacks"
            : "Create your member account to start snacking"}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0">
        {mode === "register" && (
          <div className="mb-4 p-3 rounded-xl bg-[#E6F0EE] border border-[#16433C]/20 text-[#16433C] text-xs flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#16433C] shrink-0" />
            <span>
              <strong>Member Registration:</strong> Public sign-up provides Member access only. Admin roles cannot be self-assigned.
            </span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === "register" && (
            <div>
              <label className="block text-[11px] font-bold text-[#2B1E16] uppercase tracking-wider mb-1">
                Full Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Johnson"
                  className="w-full pl-9 pr-4 py-2.5 bg-[#FAF6F0] border border-[#E6DFD3] rounded-xl text-xs text-[#2B1E16] focus:outline-hidden focus:ring-2 focus:ring-[#C2410C] focus:bg-white transition-all"
                />
                <User className="w-4 h-4 text-[#6E5D53]/60 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-[#2B1E16] uppercase tracking-wider mb-1">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full pl-9 pr-4 py-2.5 bg-[#FAF6F0] border border-[#E6DFD3] rounded-xl text-xs text-[#2B1E16] focus:outline-hidden focus:ring-2 focus:ring-[#C2410C] focus:bg-white transition-all font-mono"
              />
              <Mail className="w-4 h-4 text-[#6E5D53]/60 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#2B1E16] uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-4 py-2.5 bg-[#FAF6F0] border border-[#E6DFD3] rounded-xl text-xs text-[#2B1E16] focus:outline-hidden focus:ring-2 focus:ring-[#C2410C] focus:bg-white transition-all"
              />
              <Lock className="w-4 h-4 text-[#6E5D53]/60 absolute left-3 top-3 pointer-events-none" />
            </div>
            {mode === "register" && (
              <p className="text-[11px] text-[#6E5D53] mt-1">Minimum 6 characters</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            variant="default"
            className="w-full h-11 text-sm font-bold shadow-xs mt-2"
          >
            {loading
              ? mode === "login"
                ? "Signing in..."
                : "Creating account..."
              : mode === "login"
              ? "Sign In"
              : "Create Account"}
          </Button>
        </form>

        {/* Switch between Sign In and Register */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={toggleMode}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#C2410C] hover:text-[#9A3412] hover:underline transition-colors cursor-pointer"
          >
            {mode === "login" ? (
              <>
                <span>New teammate? Create a free account</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Already have an account? Sign in</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Demo Login Buttons for Evaluators (Shown in login mode) */}
        {mode === "login" && (
          <div className="mt-6 pt-5 border-t border-[#E6DFD3]">
            <p className="text-[10px] font-bold text-[#6E5D53] uppercase tracking-wider text-center mb-2.5">
              Quick Demo Accounts (Evaluation)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickLogin("admin@snackoverflow.local", "AdminPassword123!")}
                className="bg-[#EFEAE1] hover:bg-[#E2DAD0] text-[#3D261D] border-[#3D261D]/20 text-xs gap-1"
              >
                <Shield className="w-3 h-3 text-[#3D261D]" />
                <span>Admin</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickLogin("member1@snackoverflow.local", "Member1Password123!")}
                className="bg-[#E6F0EE] hover:bg-[#D4E6E3] text-[#16433C] border-[#16433C]/20 text-xs gap-1"
              >
                <User className="w-3 h-3 text-[#16433C]" />
                <span>Member 1</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickLogin("member2@snackoverflow.local", "Member2Password123!")}
                className="bg-[#E6F0EE] hover:bg-[#D4E6E3] text-[#16433C] border-[#16433C]/20 text-xs gap-1"
              >
                <User className="w-3 h-3 text-[#16433C]" />
                <span>Member 2</span>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
