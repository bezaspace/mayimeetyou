"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">Profile</h1>
        <p>Manage your profile and settings (placeholder).</p>
      </div>
    </ProtectedRoute>
  );
}
