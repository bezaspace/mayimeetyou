"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import { ref, getDownloadURL } from "firebase/storage";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import { Button } from "@/components/ui/button";
import { db, storage } from "@/lib/firebase";
import { formatLocationForDisplay } from "@/lib/utils";

interface FeedProfile {
  uid: string;
  displayName: string;
  age: number | null;
  city: string;
  countryCode: string;
  hideLocation: boolean;
  bio: string;
  interests: string[];
  photoUrl: string | null;
}

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
  const { showToast } = useToast();
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
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [feedProfiles, setFeedProfiles] = useState<FeedProfile[]>([]);

  useEffect(() => {
    if (!user) return;

    const loadFeedProfiles = async (
      viewerUid: string,
      viewerCity: string,
      viewerCountryCode: string,
      viewerInterests: string[]
    ) => {
      setFeedLoading(true);
      setFeedError(null);

      try {
        const usersRef = collection(db, "users");
        const q = query(
          usersRef,
          where("profileCompleted", "==", true),
          where("openToWhispers", "==", true),
          limit(50)
        );

        const snapshot = await getDocs(q);

        const candidates: any[] = [];
        snapshot.forEach((docSnap) => {
          if (docSnap.id === viewerUid) return;
          const candidateData = docSnap.data() as any;
          candidates.push({ uid: docSnap.id, ...candidateData });
        });

        if (candidates.length === 0) {
          setFeedProfiles([]);
          return;
        }

        const scored = candidates.map((candidate) => {
          const candidateInterests = Array.isArray(candidate.interests)
            ? candidate.interests
            : [];
          const overlap = viewerInterests.filter((interest) =>
            candidateInterests.includes(interest)
          ).length;
          const sameCity =
            viewerCity &&
            candidate.location?.city &&
            viewerCity.toLowerCase() ===
              String(candidate.location.city).toLowerCase();
          const sameCountry =
            viewerCountryCode &&
            candidate.location?.countryCode &&
            viewerCountryCode.toLowerCase() ===
              String(candidate.location.countryCode).toLowerCase();
          const randomBoost = Math.random() * 0.5;

          const score =
            overlap * 2 +
            (sameCity ? 1.5 : 0) +
            (!sameCity && sameCountry ? 0.5 : 0) +
            randomBoost;

          return { candidate, score };
        });

        scored.sort((a, b) => b.score - a.score);

        const top = scored.slice(0, 20).map((item) => item.candidate);

        const hydrated: FeedProfile[] = await Promise.all(
          top.map(async (candidate) => {
            let photoUrl: string | null = null;
            const photosArray = Array.isArray(candidate.photos)
              ? candidate.photos
              : [];

            if (photosArray.length > 0) {
              const primary =
                photosArray.find((p: any) => p.isPrimary) ?? photosArray[0];
              if (primary?.storagePath) {
                try {
                  const storageRef = ref(storage, primary.storagePath);
                  photoUrl = await getDownloadURL(storageRef);
                } catch (err) {
                  console.error("Failed to load profile photo", err);
                }
              }
            }

            return {
              uid: candidate.uid,
              displayName: candidate.displayName ?? "Someone new",
              age:
                typeof candidate.age === "number" ? candidate.age : null,
              city: candidate.location?.city ?? "",
              countryCode: candidate.location?.countryCode ?? "",
              hideLocation:
                typeof candidate.hideLocation === "boolean"
                  ? candidate.hideLocation
                  : false,
              bio: candidate.bio ?? "",
              interests: Array.isArray(candidate.interests)
                ? candidate.interests
                : [],
              photoUrl,
            };
          })
        );

        setFeedProfiles(hydrated);
      } catch (err) {
        console.error(err);
        setFeedError(
          "Unable to load your suggestions right now. Please try again."
        );
      } finally {
        setFeedLoading(false);
      }
    };

    const checkProfileAndFeed = async () => {
      setCheckingProfile(true);
      setError(null);

      try {
        const docRef = doc(db, "users", user.uid);
        const snap = await getDoc(docRef);
        const data = snap.data() as any | undefined;

        if (!snap.exists() || !data?.profileCompleted) {
          router.replace("/profile");
          return;
        }

        const interests = Array.isArray(data.interests) ? data.interests : [];
        const city = data.location?.city ?? "";
        const countryCode = data.location?.countryCode ?? "";

        setProfileSnippet({
          displayName: data.displayName ?? "You",
          age: typeof data.age === "number" ? data.age : null,
          city,
          countryCode,
          hideLocation:
            typeof data.hideLocation === "boolean" ? data.hideLocation : false,
          bio: data.bio ?? "",
          interests,
        });

        await loadFeedProfiles(user.uid, city, countryCode, interests);
      } catch (err) {
        console.error(err);
        setError("Unable to load your profile. Please try again.");
      } finally {
        setCheckingProfile(false);
      }
    };

    checkProfileAndFeed();
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
            A small daily set of profiles curated for you based on interests,
            location, and a touch of serendipity.
          </p>
        </div>

        <div className="rounded-2xl border bg-card/80 p-4 shadow-sm text-sm">
          <p className="font-medium mb-1">Today&apos;s suggestions</p>
          <p className="text-xs text-muted-foreground">
            You&apos;ll see up to around 10–20 profiles per day here. No endless
            swiping—just a few thoughtful cards to whisper to.
          </p>
        </div>

        {feedLoading && (
          <div className="space-y-3">
            <div className="h-48 rounded-2xl border bg-card/60 animate-pulse" />
            <div className="h-48 rounded-2xl border bg-card/60 animate-pulse" />
          </div>
        )}

        {!feedLoading && feedError && (
          <div className="rounded-2xl border bg-red-50 p-4 text-xs text-red-700">
            {feedError}
          </div>
        )}

        {!feedLoading && !feedError && feedProfiles.length === 0 && (
          <div className="rounded-2xl border bg-card/80 p-4 shadow-sm text-sm text-muted-foreground">
            <p className="font-medium mb-1">No matches just yet</p>
            <p>
              We don&apos;t have anyone to show you today. Try checking back
              tomorrow, or refreshing your interests in your profile.
            </p>
          </div>
        )}

        {!feedLoading && !feedError && feedProfiles.length > 0 && (
          <div className="relative">
            <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-1">
              {feedProfiles.map((profile) => (
                <div
                  key={profile.uid}
                  className="snap-center w-full max-w-md shrink-0"
                >
                  <ProfileCard
                    profile={profile}
                    onWhisperHi={() => {
                      showToast({
                        message:
                          "Whisper recording is coming next. For now this is a preview action.",
                        variant: "success",
                      });
                    }}
                    onPass={() => {
                      setFeedProfiles((prev) =>
                        prev.filter((item) => item.uid !== profile.uid)
                      );
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

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

function ProfileCard({
  profile,
  onWhisperHi,
  onPass,
}: {
  profile: FeedProfile;
  onWhisperHi: () => void;
  onPass: () => void;
}) {
  const [isBlurred, setIsBlurred] = useState(true);

  const locationLabel = formatLocationForDisplay(
    profile.city,
    profile.countryCode,
    profile.hideLocation
  );

  const bioPreview = profile.bio
    ? profile.bio.length > 50
      ? `${profile.bio.slice(0, 50)}…`
      : profile.bio
    : "";

  const interestBadge = profile.interests[0];

  return (
    <div className="flex h-52 gap-3 rounded-2xl border bg-card/80 p-3 shadow-sm">
      <button
        type="button"
        className="relative flex w-24 flex-shrink-0 items-end justify-center overflow-hidden rounded-xl bg-gradient-to-br from-slate-200 to-slate-300"
        onClick={() => setIsBlurred((prev) => !prev)}
      >
        {profile.photoUrl && (
          <img
            src={profile.photoUrl}
            alt={`Profile photo of ${profile.displayName}`}
            className={`absolute inset-0 h-full w-full object-cover transition-all duration-300 ${
              isBlurred ? "blur-sm scale-105" : "scale-100"
            }`}
          />
        )}
        {isBlurred && (
          <div className="relative z-10 mb-2 rounded-full bg-black/60 px-2 py-1 text-[11px] font-medium text-white">
            Tap to unblur
          </div>
        )}
      </button>

      <div className="flex flex-1 flex-col justify-between text-sm">
        <div className="space-y-1">
          <div>
            <p className="text-sm font-semibold">
              {profile.displayName}
              {profile.age ? `, ${profile.age}` : ""}
            </p>
            {locationLabel && (
              <p className="text-xs text-muted-foreground">{locationLabel}</p>
            )}
          </div>

          {interestBadge && (
            <div className="mt-1 flex flex-wrap gap-2">
              <span className="rounded-full border px-2 py-0.5 text-[11px]">
                {interestBadge}
              </span>
            </div>
          )}

          {bioPreview && (
            <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
              {bioPreview}
              {profile.bio.length > 50 && " Read more"}
            </p>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <Button
            type="button"
            size="sm"
            className="flex-1 px-3 py-1 text-xs font-medium"
            onClick={onWhisperHi}
          >
            Whisper Hi
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="px-3 py-1 text-xs font-medium"
            onClick={onPass}
          >
            Pass
          </Button>
        </div>
      </div>
    </div>
  );
}
