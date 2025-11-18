 import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

// Simple development-only seed script to create 20 mock Indian users in Firestore.
// Run this with Firebase Admin credentials (see README / script header comments).

initializeApp({
  credential: applicationDefault(),
});

const db = getFirestore();

const INDIAN_CITIES = [
  "Bengaluru",
  "Mumbai",
  "Delhi",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Pune",
  "Ahmedabad",
  "Jaipur",
  "Lucknow",
  "Surat",
  "Nagpur",
  "Indore",
  "Bhopal",
  "Patna",
  "Kochi",
  "Chandigarh",
  "Gurgaon",
  "Noida",
  "Visakhapatnam",
] as const;

const FIRST_NAMES = [
  "Aarav",
  "Vihaan",
  "Aditya",
  "Isha",
  "Diya",
  "Ananya",
  "Kabir",
  "Rohan",
  "Saanvi",
  "Mira",
  "Arjun",
  "Ria",
  "Dev",
  "Kriti",
  "Nikhil",
  "Simran",
  "Varun",
  "Tara",
  "Ishaan",
  "Leah",
] as const;

const GENDERS = [
  "male",
  "female",
  "non_binary",
] as const;

const ORIENTATIONS = [
  "straight",
  "gay",
  "bi",
  "pan",
  "ace",
  "other",
] as const;

const INTERESTS = [
  "Hiking",
  "Coffee",
  "Books",
  "Movies",
  "Music",
  "Stand-up comedy",
  "Yoga",
  "Startup ideas",
  "Travel",
  "Art museums",
  "Cooking",
  "Street food",
  "Board games",
  "Podcasts",
  "Writing",
  "Photography",
] as const;

const DEAL_BREAKERS = [
  "no_smokers",
  "no_kids",
  "wants_kids",
  "pets_ok",
] as const;

// We use randomuser.me avatar URLs as mock photo URLs.
// These are stored in the photos[].storagePath field for now so that
// existing UI that just displays storagePath continues to work.
const RANDOMUSER_AVATAR_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function pickRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandomSubset<T>(items: readonly T[], min: number, max: number): T[] {
  const count = pickRandomInt(min, max);
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function buildAvatarUrl(index: number, gender: (typeof GENDERS)[number]): string {
  const id = RANDOMUSER_AVATAR_IDS[index % RANDOMUSER_AVATAR_IDS.length];
  if (gender === "female") {
    return `https://randomuser.me/api/portraits/women/${id}.jpg`;
  }
  if (gender === "male") {
    return `https://randomuser.me/api/portraits/men/${id}.jpg`;
  }
  return `https://randomuser.me/api/portraits/lego/${id}.jpg`;
}

async function seedUsers() {
  const now = Timestamp.now();

  const batch = db.batch();

  for (let i = 0; i < 20; i++) {
    const uid = `seed-user-${i + 1}`;

    const city = INDIAN_CITIES[i % INDIAN_CITIES.length];
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const gender = pickRandom(GENDERS);
    const orientation = pickRandom(ORIENTATIONS);
    const age = pickRandomInt(22, 35);

    const interests = pickRandomSubset(INTERESTS, 3, 5);
    const dealBreakers = pickRandomSubset(DEAL_BREAKERS, 0, 2);

    const avatarUrl = buildAvatarUrl(i, gender);

    const photosCount = pickRandomInt(1, 3);
    const photos = Array.from({ length: photosCount }).map((_, index) => ({
      id: `seed-photo-${i + 1}-${index + 1}`,
      // Note: using external URL in storagePath for mock data only.
      storagePath: avatarUrl,
      isPrimary: index === 0,
      createdAt: now,
    }));

    const bio = `${firstName} from ${city} who loves ${interests[0].toLowerCase()} and is here to say the magic words.`;

    const userDocRef = db.collection("users").doc(uid);

    batch.set(userDocRef, {
      uid,
      displayName: firstName,
      age,
      gender,
      orientation,
      location: {
        city,
        countryCode: "IN",
      },
      photos,
      bio,
      interests,
      dealBreakers,
      openToWhispers: true,
      hideLocation: false,
      profileCompleted: true,
      createdAt: now,
      updatedAt: now,
      lastActiveAt: now,
    });
  }

  await batch.commit();

  console.log("Seeded 20 mock Indian users into Firestore 'users' collection.");
}

seedUsers()
  .then(() => {
    console.log("Seeding complete.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error seeding users", err);
    process.exit(1);
  });
