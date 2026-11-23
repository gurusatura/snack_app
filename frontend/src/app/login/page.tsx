"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-amber-50/20 to-orange-50/30 flex items-center justify-center p-4">
      <LoginForm onSuccess={() => router.push("/")} />
    </main>
  );
}
