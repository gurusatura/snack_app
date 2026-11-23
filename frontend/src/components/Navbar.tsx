"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Cookie, Package, Clock, ShieldCheck, LogOut, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Navbar: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 bg-[#FFFDF9]/95 backdrop-blur-md border-b border-[#E6DFD3] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Main Navigation */}
        <div className="flex items-center gap-6 sm:gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            {/* Deep forest teal brand container */}
            <div className="w-9 h-9 rounded-xl bg-[#16433C] flex items-center justify-center text-[#FAF6F0] shadow-xs group-hover:bg-[#0F312B] transition-colors">
              <Cookie className="w-5 h-5 text-[#FAF6F0]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-extrabold text-[#2B1E16] tracking-tight leading-none">
                  Snack Overflow
                </h1>
                {/* Deep teal grounding pill */}
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-bold uppercase tracking-wider">
                  Pantry Ops
                </Badge>
              </div>
              <p className="text-[11px] text-[#6E5D53] font-medium hidden sm:block">Office Pantry Inventory</p>
            </div>
          </Link>

          {/* Navigation Links */}
          {user && (
            <nav className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  pathname === "/"
                    ? "bg-[#E6F0EE] text-[#16433C] font-bold shadow-xs border border-[#16433C]/25"
                    : "text-[#6E5D53] hover:text-[#2B1E16] hover:bg-[#EFEAE1]/60"
                }`}
              >
                <Package className="w-3.5 h-3.5 text-[#16433C]" />
                <span>Pantry</span>
              </Link>
              {isAdmin && (
                <>
                  <Link
                    href="/activity"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      pathname === "/activity"
                        ? "bg-[#EFEAE1] text-[#3D261D] font-bold shadow-xs border border-[#3D261D]/25"
                        : "text-[#6E5D53] hover:text-[#3D261D] hover:bg-[#EFEAE1]/60"
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 text-[#3D261D]" />
                    <span>Activity Log</span>
                  </Link>
                  <Link
                    href="/login-history"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      pathname === "/login-history"
                        ? "bg-[#E6F0EE] text-[#16433C] font-bold shadow-xs border border-[#16433C]/25"
                        : "text-[#6E5D53] hover:text-[#16433C] hover:bg-[#E6F0EE]/60"
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-[#16433C]" />
                    <span>Login Audit</span>
                  </Link>
                </>
              )}
            </nav>
          )}
        </div>

        {/* User Info & Persistent Logout */}
        {user ? (
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-right">
              <div className="text-xs font-bold text-[#2B1E16] leading-tight flex items-center justify-end gap-1.5">
                <UserIcon className="w-3 h-3 text-[#16433C]" />
                <span>{user.name}</span>
              </div>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <Badge
                  variant={isAdmin ? "coffee" : "secondary"}
                  className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0"
                >
                  {isAdmin ? "Admin" : "Member"}
                </Badge>
                <span className="text-[11px] text-[#6E5D53] hidden md:inline font-mono">{user.email}</span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="hover:border-red-300 hover:bg-red-50 hover:text-red-700 text-[#6E5D53] gap-1.5"
              title="Sign out of your session"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Log out</span>
            </Button>
          </div>
        ) : (
          <Link href="/login">
            <Button variant="default" size="sm">
              Sign In
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
};
