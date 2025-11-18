"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <div className="px-4 pb-24 pt-6">
        <div className="mx-auto max-w-md space-y-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Chat</h1>
            <p className="text-sm text-muted-foreground">
              Chat interface for matches (placeholder).
            </p>
          </div>

          <div className="rounded-2xl border bg-card/80 p-4 shadow-sm text-sm text-muted-foreground">
            <p className="font-medium mb-1">Your future conversations</p>
            <p>
              After matches are created, this space will turn into a familiar
              chat list and message view with bubbles, typing indicators,
              and a pinned "How we met" whisper at the top.
            </p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
