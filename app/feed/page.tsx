"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function FeedPage() {
  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">Feed</h1>
        <p>Discover profiles here (placeholder).</p>
      </div>
    </ProtectedRoute>
  );
}
