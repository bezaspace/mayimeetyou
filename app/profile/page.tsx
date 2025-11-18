"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc, Timestamp } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import { db, storage } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non_binary", label: "Non-binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const ORIENTATION_OPTIONS = [
  { value: "straight", label: "Straight" },
  { value: "gay", label: "Gay" },
  { value: "bi", label: "Bi" },
  { value: "pan", label: "Pan" },
  { value: "ace", label: "Ace" },
  { value: "other", label: "Other" },
];

const INTEREST_OPTIONS: string[] = [
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

const DEAL_BREAKER_OPTIONS: string[] = [
  "No smokers",
  "Kids someday is a must",
  "Not looking for kids",
  "Wants pets",
  "Doesn't want pets",
];

const MAX_PHOTOS = 5;
const MAX_BIO_LENGTH = 150;
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

interface DraftProfile {
  age: number;
  gender: string;
  orientation: string;
  city: string;
  countryCode: string;
  bio: string;
  interests: string[];
  dealBreakers: string[];
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileInner />
    </ProtectedRoute>
  );
}

function ProfileInner() {
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(true);

  const [age, setAge] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [orientation, setOrientation] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [countryCode, setCountryCode] = useState<string>("");
  const [bio, setBio] = useState<string>("");
  const [interests, setInterests] = useState<string[]>([]);
  const [dealBreakers, setDealBreakers] = useState<string[]>([]);
  const [openToWhispers, setOpenToWhispers] = useState<boolean>(true);

  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [showWhispersPrompt, setShowWhispersPrompt] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<DraftProfile | null>(null);

  const [interestQuery, setInterestQuery] = useState<string>("");

  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, "users", user.uid);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          const data = snap.data() as any;
          setIsFirstTime(!data.profileCompleted);
          setAge(data.age ? String(data.age) : "");
          setGender(data.gender ?? "");
          setOrientation(data.orientation ?? "");
          setCity(data.location?.city ?? "");
          setCountryCode(data.location?.countryCode ?? "");
          setBio(data.bio ?? "");
          setInterests(Array.isArray(data.interests) ? data.interests : []);
          setDealBreakers(
            Array.isArray(data.dealBreakers) ? data.dealBreakers : []
          );
          setOpenToWhispers(
            typeof data.openToWhispers === "boolean" ? data.openToWhispers : true
          );
        } else {
          setIsFirstTime(true);
          const locale = Intl.DateTimeFormat().resolvedOptions().locale;
          const parts = locale.split("-");
          if (parts.length > 1 && !countryCode) {
            setCountryCode(parts[1].toUpperCase());
          }
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load profile. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const ageNumber = useMemo(() => {
    const value = parseInt(age, 10);
    return Number.isNaN(value) ? null : value;
  }, [age]);

  const isUnderage = ageNumber !== null && ageNumber > 0 && ageNumber < 18;

  const progressPercent = useMemo(() => {
    let completedSections = 0;
    let totalSections = 2;

    if (ageNumber && ageNumber >= 18 && gender && orientation && city) {
      completedSections += 1;
    }

    if (bio || interests.length > 0 || dealBreakers.length > 0 || selectedPhotos.length > 0) {
      completedSections += 1;
    }

    return Math.round((completedSections / totalSections) * 100);
  }, [ageNumber, gender, orientation, city, bio, interests, dealBreakers, selectedPhotos]);

  const filteredInterests = useMemo(() => {
    const q = interestQuery.trim().toLowerCase();
    if (!q) return INTEREST_OPTIONS;
    return INTEREST_OPTIONS.filter((item) =>
      item.toLowerCase().includes(q)
    );
  }, [interestQuery]);

  if (!user) {
    return null;
  }

  const handleLocationAutofill = () => {
    try {
      const locale = Intl.DateTimeFormat().resolvedOptions().locale;
      const parts = locale.split("-");
      if (parts.length > 1) {
        setCountryCode(parts[1].toUpperCase());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = event.target.files;
    if (!files) return;

    const incoming = Array.from(files);
    const all = [...selectedPhotos];

    for (const file of incoming) {
      if (file.size > MAX_PHOTO_SIZE_BYTES) {
        setError("Each photo must be 5MB or less.");
        continue;
      }
      if (all.length < MAX_PHOTOS) {
        all.push(file);
      }
    }

    setSelectedPhotos(all);
  };

  const toggleInterest = (value: string) => {
    setInterests((prev) => {
      if (prev.includes(value)) {
        return prev.filter((item) => item !== value);
      }
      return [...prev, value];
    });
  };

  const toggleDealBreaker = (value: string) => {
    setDealBreakers((prev) => {
      if (prev.includes(value)) {
        return prev.filter((item) => item !== value);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, value];
    });
  };

  const validateForm = () => {
    if (!ageNumber || ageNumber < 18) {
      return "You must be at least 18 to use MayIMeetYou.";
    }
    if (!gender) {
      return "Please select your gender.";
    }
    if (!orientation) {
      return "Please select your orientation.";
    }
    if (!city.trim()) {
      return "Please enter your city.";
    }
    if (!countryCode.trim()) {
      return "Please enter your country code.";
    }
    if (bio.length > MAX_BIO_LENGTH) {
      return "Bio must be 150 characters or fewer.";
    }
    if (interests.length > 0 && (interests.length < 3 || interests.length > 5)) {
      return "If you add interests, please choose between 3 and 5.";
    }
    return null;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!ageNumber) {
      setError("Please enter a valid age.");
      return;
    }

    const draft: DraftProfile = {
      age: ageNumber,
      gender,
      orientation,
      city: city.trim(),
      countryCode: countryCode.trim().toUpperCase(),
      bio: bio.trim(),
      interests,
      dealBreakers,
    };

    if (isFirstTime) {
      setPendingDraft(draft);
      setShowWhispersPrompt(true);
    } else {
      await saveProfile(draft, openToWhispers, false);
      router.replace("/feed");
    }
  };

  const saveProfile = async (
    draft: DraftProfile,
    openToWhispersValue: boolean,
    markCompleted: boolean
  ) => {
    if (!user) return;
    setSaving(true);

    try {
      const docRef = doc(db, "users", user.uid);
      const snap = await getDoc(docRef);

      const photosToSave: any[] = [];

      if (selectedPhotos.length > 0) {
        for (const file of selectedPhotos) {
          const photoId = crypto.randomUUID();
          const storagePath = `user_photos/${user.uid}/${photoId}`;
          const storageRef = ref(storage, storagePath);
          await uploadBytes(storageRef, file);
          photosToSave.push({
            id: photoId,
            storagePath,
            isPrimary: false,
            createdAt: Timestamp.now(),
          });
        }
        if (photosToSave.length > 0) {
          photosToSave[0].isPrimary = true;
        }
      }

      const baseData: any = {
        age: draft.age,
        gender: draft.gender,
        orientation: draft.orientation,
        location: {
          city: draft.city,
          countryCode: draft.countryCode,
        },
        bio: draft.bio,
        interests: draft.interests,
        dealBreakers: draft.dealBreakers,
        openToWhispers: openToWhispersValue,
        hideLocation: false,
        profileCompleted: markCompleted,
        updatedAt: serverTimestamp(),
        lastActiveAt: serverTimestamp(),
      };

      if (photosToSave.length > 0) {
        baseData.photos = photosToSave;
      }

      if (snap.exists()) {
        await updateDoc(docRef, baseData);
      } else {
        await setDoc(docRef, {
          uid: user.uid,
          displayName: user.displayName ?? "",
          photos: photosToSave,
          hideLocation: false,
          profileCompleted: markCompleted,
          createdAt: serverTimestamp(),
          ...baseData,
        });
      }
    } catch (err) {
      console.error(err);
      setError("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <p>Loading your profile...</p>
      </div>
    );
  }

  if (isUnderage) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-4">
        <h1 className="text-2xl font-bold">MayIMeetYou is 18+ only</h1>
        <p>
          Thanks for your interest, but you need to be at least 18 years old to
          use MayIMeetYou. Please come back when you are old enough.
        </p>
        <p className="text-sm text-muted-foreground">
          If you are looking for support or resources, consider talking to a
          trusted adult or exploring youth-friendly mental health resources in
          your area.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-24 pt-6">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-semibold mb-2">
          {isFirstTime ? "Set up your profile" : "Edit your profile"}
        </h1>
        <p className="mb-4 text-sm text-muted-foreground">
          This should take under 2 minutes. Required basics first, then optional
          details you can skip for now.
        </p>

        <Progress value={progressPercent} className="mb-6" />

        {error && (
          <div className="mb-4 rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Basics</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Age *</Label>
              <Input
                type="number"
                min={18}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <Label>Gender *</Label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                required
              >
                <option value="">Select gender</option>
                {GENDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label>Orientation *</Label>
              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                required
              >
                <option value="">Select orientation</option>
                {ORIENTATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label>City *</Label>
              <Input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Bangalore"
                required
              />
            </div>

            <div className="space-y-1">
              <Label>Country code *</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
                  placeholder="e.g. IN"
                  maxLength={2}
                  required
                />
                <Button
                  type="button"
                  onClick={handleLocationAutofill}
                  variant="outline"
                  size="sm"
                  className="whitespace-nowrap text-xs"
                >
                  Use my device
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                We only show your city, never your exact address.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Optional extras</h2>
            <span className="text-xs text-muted-foreground">
              You can skip these for now.
            </span>
          </div>

          <div className="space-y-1">
            <Label>Photos (1–5)</Label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoChange}
              className="w-full text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Add up to {MAX_PHOTOS} photos. Max 5MB each.
            </p>
            {selectedPhotos.length > 0 && (
              <p className="text-xs mt-1">
                {selectedPhotos.length} photo
                {selectedPhotos.length > 1 ? "s" : ""} selected.
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Short bio (0–150 chars)</Label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO_LENGTH))}
              rows={3}
              placeholder="What should people know about you?"
            />
            <p className="text-xs text-muted-foreground">
              {bio.length}/{MAX_BIO_LENGTH} characters
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Interests (pick 3–5 if you add any)</Label>
              <Input
                type="text"
                value={interestQuery}
                onChange={(e) => setInterestQuery(e.target.value)}
                placeholder="Search interests"
                className="w-40 text-xs"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {filteredInterests.map((item) => {
                const selected = interests.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleInterest(item)}
                    className={`px-3 py-1 rounded-full border text-xs ${
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

          <div className="space-y-1">
            <Label>Deal-breakers (1–3 toggles, optional)</Label>
            <div className="flex flex-wrap gap-2">
              {DEAL_BREAKER_OPTIONS.map((item) => {
                const selected = dealBreakers.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleDealBreaker(item)}
                    className={`px-3 py-1 rounded-full border text-xs ${
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
        </section>

        {!isFirstTime && (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">Whispers</h2>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={openToWhispers}
                onChange={(e) => setOpenToWhispers(e.target.checked)}
              />
              <span>Open to Whispers</span>
            </label>
          </section>
        )}

        <div className="pt-2 flex gap-3">
          <Button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm font-medium"
          >
            {saving
              ? "Saving..."
              : isFirstTime
              ? "Continue"
              : "Save profile"}
          </Button>
        </div>
        </form>

        {showWhispersPrompt && pendingDraft && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-full max-w-sm rounded-lg bg-white p-6 space-y-4">
              <h2 className="text-lg font-semibold mb-1">Open to Whispers?</h2>
              <p className="text-sm text-muted-foreground">
                This lets people send you polite audio intros. You can change this
                anytime from your profile.
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  type="button"
                  onClick={async () => {
                    await saveProfile(pendingDraft, true, true);
                    setShowWhispersPrompt(false);
                    router.replace("/feed");
                  }}
                  className="px-4 py-2 text-sm font-medium"
                >
                  Yes, I'm open to Whispers
                </Button>
                <Button
                  type="button"
                  onClick={async () => {
                    await saveProfile(pendingDraft, false, true);
                    setShowWhispersPrompt(false);
                    router.replace("/feed");
                  }}
                  variant="outline"
                  className="px-4 py-2 text-sm font-medium"
                >
                  Not yet
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
