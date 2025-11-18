"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function WhispersPage() {
  return (
    <ProtectedRoute>
      <div className="px-4 pb-24 pt-6">
        <div className="mx-auto max-w-md space-y-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Whispers</h1>
            <p className="text-sm text-muted-foreground">
              Inbox for incoming whispers (placeholder).
            </p>
          </div>

          <div className="rounded-2xl border bg-card/80 p-4 shadow-sm text-sm text-muted-foreground">
            <p className="font-medium mb-1">Nothing to play just yet</p>
            <p>
              Once the inbox is wired up, new whispers will land here with
              a gentle unread badge, simple list, and a full-screen player so
              you stay in control of what to hear and who to approve.
            </p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
