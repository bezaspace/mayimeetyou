"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";
import { formatLocationForDisplay } from "@/lib/utils";

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
  const [profileSnippet, setProfileSnippet] = useState<{
    displayName: string;
    age: number | null;
    city: string;
    countryCode: string;
    hideLocation: boolean;
    bio: string;
    interests: string[];
  } | null>(null);

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

        setProfileSnippet({
          displayName: data.displayName ?? "You",
          age: typeof data.age === "number" ? data.age : null,
          city: data.location?.city ?? "",
          countryCode: data.location?.countryCode ?? "",
          hideLocation:
            typeof data.hideLocation === "boolean" ? data.hideLocation : false,
          bio: data.bio ?? "",
          interests: Array.isArray(data.interests) ? data.interests : [],
        });

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

        {profileSnippet && (
          <div className="rounded-2xl border bg-card/80 p-4 shadow-sm text-sm space-y-2">
            <p className="text-xs uppercase text-muted-foreground">
              How others might see you
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">
                  {profileSnippet.displayName}
                  {profileSnippet.age ? `, ${profileSnippet.age}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatLocationForDisplay(
                    profileSnippet.city,
                    profileSnippet.countryCode,
                    profileSnippet.hideLocation
                  )}
                </p>
              </div>
            </div>
            {profileSnippet.bio && (
              <p className="text-xs">
                {profileSnippet.bio.length > 50
                  ? `${profileSnippet.bio.slice(0, 50)}…`
                  : profileSnippet.bio}
              </p>
            )}
            {profileSnippet.interests.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                <span className="rounded-full border px-2 py-0.5 text-[11px]">
                  {profileSnippet.interests[0]}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
