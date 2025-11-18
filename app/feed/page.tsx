"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";

export default function FeedPage() {
  return (
    <ProtectedRoute>
      <FeedInner />
    </ProtectedRoute>
  );
}

function FeedInner() {
  const { user } = useAuth();
  const router = useRouter();
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const checkProfile = async () => {
      setCheckingProfile(true);
      try {
        const docRef = doc(db, "users", user.uid);
        const snap = await getDoc(docRef);
        const data = snap.data() as any | undefined;

        if (!snap.exists() || !data?.profileCompleted) {
          router.replace("/profile");
          return;
        }

        setCheckingProfile(false);
      } catch (err) {
        console.error(err);
        setError("Unable to load your profile. Please try again.");
        setCheckingProfile(false);
      }
    };

    checkProfile();
  }, [user, router]);

  if (!user || checkingProfile) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 pb-20">
        <div className="w-full max-w-sm space-y-3 rounded-2xl border bg-card/80 p-4 shadow-sm">
          <p className="text-sm font-medium">Loading your feed...</p>
          <p className="text-xs text-muted-foreground">
            We are checking your profile and getting suggestions ready.
          </p>
          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-24 pt-6">
      <div className="mx-auto max-w-md space-y-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Feed</h1>
          <p className="text-sm text-muted-foreground">
            Once the core matching is wired up, you will see a small daily set of
            profiles curated just for you.
          </p>
        </div>

        <div className="rounded-2xl border bg-card/80 p-4 shadow-sm text-sm text-muted-foreground">
          <p className="font-medium mb-1">Today&apos;s whispers</p>
          <p>
            For now this is a placeholder. After we build the feed logic,
            this area will show blurred photo cards with a "Whisper Hi" button
            and a gentle limit so you focus on quality, not swiping.
          </p>
        </div>
      </div>
    </div>
  );
}
