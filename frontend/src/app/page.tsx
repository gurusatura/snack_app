"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { LoginForm } from "@/components/LoginForm";
import { DashboardView } from "@/components/DashboardView";

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-50 via-amber-50/20 to-orange-50/30 flex items-center justify-center p-4">
        <LoginForm />
      </main>
    );
  }

  return <DashboardView />;
}
