"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export const Navbar: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();
  const pathname = usePathname();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Main Navigation */}
        <div className="flex items-center gap-6 sm:gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center text-white font-black text-sm tracking-tighter group-hover:bg-amber-600 transition-colors">
              SO
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-none">Snack Overflow</h1>
              <p className="text-[11px] text-gray-500 font-medium hidden sm:block">Pantry Inventory</p>
            </div>
          </Link>

          {/* Navigation Links */}
          {user && (
            <nav className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  pathname === "/"
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                Pantry
              </Link>
              {isAdmin && (
                <Link
                  href="/activity"
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                    pathname === "/activity"
                      ? "bg-purple-50 text-purple-900 border border-purple-200"
                      : "text-gray-600 hover:text-purple-700 hover:bg-purple-50/50"
                  }`}
                >
                  Activity Log
                </Link>
              )}
            </nav>
          )}
        </div>

        {/* User Info & Persistent Logout */}
        {user ? (
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-right">
              <div className="text-xs font-bold text-gray-900 leading-tight">{user.name}</div>
              <div className="flex items-center justify-end gap-1.5">
                <span
                  className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wide ${
                    isAdmin
                      ? "bg-purple-100 text-purple-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {isAdmin ? "Admin" : "Member"}
                </span>
                <span className="text-[11px] text-gray-400 hidden md:inline">{user.email}</span>
              </div>
            </div>

            <button
              onClick={logout}
              className="px-3 py-1.5 text-xs font-semibold text-gray-700 hover:text-red-700 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-lg transition-colors cursor-pointer"
              title="Sign out of your session"
            >
              Log out
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-gray-900 hover:bg-black rounded-lg transition-colors"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
};
