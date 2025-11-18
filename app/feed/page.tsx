"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  where,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { ref, getDownloadURL } from "firebase/storage";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import { Button } from "@/components/ui/button";
import { db, storage } from "@/lib/firebase";
import { formatLocationForDisplay } from "@/lib/utils";
import { FeedInteraction } from "@/lib/types";

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

const ORIENTATION_FILTER_OPTIONS = [
  { value: "", label: "Any orientation" },
  { value: "straight", label: "Straight" },
  { value: "gay", label: "Gay" },
  { value: "bi", label: "Bi" },
  { value: "pan", label: "Pan" },
  { value: "ace", label: "Ace" },
  { value: "other", label: "Other" },
];

const INTEREST_FILTER_OPTIONS: string[] = [
  "Books",
  "Coffee",
  "Hiking",
  "Running",
  "Cooking",
  "Live music",
  "Podcasts",
  "Yoga",
  "Board games",
  "Art & museums",
  "Tech & startups",
  "Movies",
  "Photography",
  "Travel",
  "Foodie",
  "Fitness",
  "Writing",
  "Gaming",
  "Dancing",
  "Outdoors",
];

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
  const [noProfilesReason, setNoProfilesReason] = useState<
    "none" | "filters"
  >("none");
  const [orientationFilter, setOrientationFilter] = useState<string>("");
  const [interestFilter, setInterestFilter] = useState<string[]>([]);
  const [interestFilterQuery, setInterestFilterQuery] = useState<string>("");

  const handleInteractionUpdate = async (
    targetProfile: FeedProfile,
    action: "liked" | "passed"
  ) => {
    if (!user) return;

    try {
      const interactionsCollection = collection(
        db,
        "users",
        user.uid,
        "feedInteractions"
      );
      const interactionRef = doc(interactionsCollection, targetProfile.uid);

      const interestsSnapshot = Array.isArray(targetProfile.interests)
        ? targetProfile.interests
        : [];

      const payload: any = {
        targetUserId: targetProfile.uid,
        lastAction: action,
        lastActionAt: serverTimestamp(),
        interestsSnapshot,
      };

      if (action === "liked") {
        payload.likeCount = increment(1);
      }

      if (action === "passed") {
        payload.passCount = increment(1);
      }

      await setDoc(interactionRef, payload, { merge: true });
    } catch (err) {
      console.error("Failed to record feed interaction", err);
    }
  };

  const filteredInterestOptions = useMemo(() => {
    const q = interestFilterQuery.trim().toLowerCase();
    if (!q) return INTEREST_FILTER_OPTIONS;
    return INTEREST_FILTER_OPTIONS.filter((item) =>
      item.toLowerCase().includes(q)
    );
  }, [interestFilterQuery]);

  useEffect(() => {
    if (!user) return;
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(
        `mayimeetyou:feedFilters:${user.uid}`
      );
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        if (typeof parsed.orientation === "string") {
          setOrientationFilter(parsed.orientation);
        }
        if (Array.isArray(parsed.interests)) {
          setInterestFilter(parsed.interests);
        }
      }
    } catch (storageError) {
      console.error(storageError);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(
        `mayimeetyou:feedFilters:${user.uid}`,
        JSON.stringify({
          orientation: orientationFilter,
          interests: interestFilter,
        })
      );
    } catch (storageError) {
      console.error(storageError);
    }
  }, [user, orientationFilter, interestFilter]);

  useEffect(() => {
    if (!user) return;

    const loadFeedProfiles = async (
      viewerUid: string,
      viewerCity: string,
      viewerCountryCode: string,
      viewerInterests: string[],
      interactionsByTarget: Record<string, FeedInteraction>,
      likedInterestWeights: Record<string, number>,
      totalLikes: number
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
        let filteredCandidates = [...candidates];

        const hasOrientationFilter = !!orientationFilter;
        const hasInterestFilter =
          Array.isArray(interestFilter) && interestFilter.length > 0;

        if (hasOrientationFilter) {
          filteredCandidates = filteredCandidates.filter((candidate) => {
            return candidate.orientation === orientationFilter;
          });
        }

        if (hasInterestFilter) {
          filteredCandidates = filteredCandidates.filter((candidate) => {
            const candidateInterests = Array.isArray(candidate.interests)
              ? candidate.interests
              : [];
            return interestFilter.some((value) =>
              candidateInterests.includes(value)
            );
          });
        }

        filteredCandidates = filteredCandidates.filter((candidate) => {
          const interaction = interactionsByTarget[candidate.uid];
          if (!interaction) return true;

          const passCount =
            typeof interaction.passCount === "number" ? interaction.passCount : 0;

          if (interaction.lastAction === "passed" && passCount > 0) {
            return false;
          }

          return true;
        });

        if (filteredCandidates.length === 0) {
          setFeedProfiles([]);
          if (hasOrientationFilter || hasInterestFilter) {
            setNoProfilesReason("filters");
          } else {
            setNoProfilesReason("none");
          }
          return;
        }

        const hasPersonalizationSignal = totalLikes >= 3;

        const scored = filteredCandidates.map((candidate) => {
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

          let personalizationBoost = 0;

          if (hasPersonalizationSignal) {
            for (const interest of candidateInterests) {
              const weight = likedInterestWeights[interest];
              if (weight) {
                personalizationBoost += 0.5 + Math.min(weight, 3) * 0.2;
              }
            }
          }

          const score =
            overlap * 2 +
            (sameCity ? 1.5 : 0) +
            (!sameCity && sameCountry ? 0.5 : 0) +
            personalizationBoost +
            randomBoost;

          return { candidate, score };
        });

        scored.sort((a, b) => b.score - a.score);

        const hydrated: FeedProfile[] = await Promise.all(
          scored.map((item) => item.candidate).map(async (candidate) => {
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

        const interactionsRef = collection(
          db,
          "users",
          user.uid,
          "feedInteractions"
        );
        const interactionsSnap = await getDocs(interactionsRef);

        const interactionsByTarget: Record<string, FeedInteraction> = {};
        const likedInterestWeights: Record<string, number> = {};
        let totalLikes = 0;

        interactionsSnap.forEach((interactionDoc) => {
          const interactionData = interactionDoc.data() as any;
          const targetUserId =
            interactionData.targetUserId || interactionDoc.id;
          const lastAction = interactionData
            .lastAction as FeedInteraction["lastAction"];
          const likeCount =
            typeof interactionData.likeCount === "number"
              ? interactionData.likeCount
              : 0;
          const passCount =
            typeof interactionData.passCount === "number"
              ? interactionData.passCount
              : 0;
          const interestsSnapshot = Array.isArray(
            interactionData.interestsSnapshot
          )
            ? interactionData.interestsSnapshot
            : [];

          interactionsByTarget[targetUserId] = {
            targetUserId,
            lastAction,
            lastActionAt: interactionData.lastActionAt,
            likeCount,
            passCount,
            interestsSnapshot,
          };

          if (lastAction === "liked" && likeCount > 0) {
            totalLikes += likeCount;
            interestsSnapshot.forEach((interest: string) => {
              if (!interest) return;
              likedInterestWeights[interest] =
                (likedInterestWeights[interest] || 0) + likeCount;
            });
          }
        });

        await loadFeedProfiles(
          user.uid,
          city,
          countryCode,
          interests,
          interactionsByTarget,
          likedInterestWeights,
          totalLikes
        );
      } catch (err) {
        console.error(err);
        setError("Unable to load your profile. Please try again.");
      } finally {
        setCheckingProfile(false);
      }
    };

    checkProfileAndFeed();
  }, [user, router, orientationFilter, interestFilter]);

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
            You&apos;ll see a small curated set of profiles here. No endless
            swiping—just a few thoughtful cards to whisper to.
          </p>
        </div>

        <div className="rounded-2xl border bg-card/80 p-4 shadow-sm space-y-3 text-sm">
          <div className="flex flex-col gap-3">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Filters
              </p>
              <div className="flex flex-col gap-3">
                <div className="space-y-1">
                  <p className="text-xs">Orientation</p>
                  <select
                    value={orientationFilter}
                    onChange={(e) => setOrientationFilter(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-xs"
                  >
                    {ORIENTATION_FILTER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs">Interests</p>
                    <input
                      type="text"
                      value={interestFilterQuery}
                      onChange={(e) => setInterestFilterQuery(e.target.value)}
                      placeholder="Search interests"
                      className="w-32 rounded-md border px-2 py-1 text-[11px]"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {filteredInterestOptions.map((item) => {
                      const selected = interestFilter.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => {
                            setInterestFilter((prev) => {
                              if (prev.includes(item)) {
                                return prev.filter((value) => value !== item);
                              }
                              return [...prev, item];
                            });
                          }}
                          className={`px-2 py-0.5 rounded-full border text-[11px] ${
                            selected
                              ? "bg-black text-white border-black"
                              : "bg-background text-foreground"
                          }`}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            {(orientationFilter || interestFilter.length > 0) && (
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">
                  Filters stay on until you clear them.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="px-2 py-0.5 text-[11px]"
                  onClick={() => {
                    setOrientationFilter("");
                    setInterestFilter([]);
                    setInterestFilterQuery("");
                  }}
                >
                  Clear filters
                </Button>
              </div>
            )}
          </div>
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
          <div className="rounded-2xl border bg-card/80 p-4 shadow-sm text-sm space-y-2">
            {noProfilesReason === "filters" ? (
              <>
                <p className="font-medium mb-1">No profiles match these filters</p>
                <p className="text-sm text-muted-foreground">
                  Try expanding your orientation or interest filters to see more
                  people.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 text-xs font-medium"
                  onClick={() => {
                    setOrientationFilter("");
                    setInterestFilter([]);
                    setInterestFilterQuery("");
                  }}
                >
                  Clear filters
                </Button>
              </>
            ) : (
              <>
                <p className="font-medium mb-1">No matches just yet</p>
                <p className="text-sm text-muted-foreground">
                  We don&apos;t have anyone to show you right now. Try checking
                  back tomorrow, or refreshing your interests in your profile.
                </p>
              </>
            )}
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
                      handleInteractionUpdate(profile, "liked");
                    }}
                    onPass={() => {
                      setFeedProfiles((prev) =>
                        prev.filter((item) => item.uid !== profile.uid)
                      );
                      handleInteractionUpdate(profile, "passed");
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
