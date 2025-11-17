# MayIMeetYou – Firebase Data & Database Design

> **Version:** 1.0  
> **Date:** 2025-11-17  
> **Scope:** Data model + Firebase product choices for the MayIMeetYou MVP as described in `idea.md` and `mayimeetyou-dev-plan.md`.

---

## 1. Technical Stack & Firebase Products

### 1.1 App Stack

- **Frontend:** Next.js (web, mobile-first UI).  
- **Platform:** SPA/MPA with client-side Firebase SDK usage, plus server-side helpers (Next.js API routes or Cloud Functions callable endpoints) for sensitive operations.

### 1.2 Firebase Products Used

- **Firebase Authentication**  
  - Google Sign-In only.  
  - Source of truth for `uid` and Google account email; profile metadata mirrored into Firestore.

- **Cloud Firestore (primary database)**  
  - Stores user profiles, feed metadata, whispers, matches, chat messages, safety logs, reports, and usage counters.  
  - Real-time updates for inbox, chat, and basic stats.

- **Cloud Storage for Firebase**  
  - Stores user photos, whisper audio clips, chat media.  
  - File paths referenced from Firestore documents.  
  - Background cleanup of expired/unmatched content.

- **Cloud Functions for Firebase** (or Next.js server + Admin SDK where appropriate)  
  - Enforce business logic that must not be forged client-side:
    - Whisper send pipeline (quota checks, safety checks, routing to receiver inbox).  
    - Whisper status updates & play notifications.  
    - Match creation and chat unlock.  
    - Report handling, auto-suspension thresholds.  
    - Scheduled jobs (expire whispers after 48h unplayed, delete unmatched audio after 7 days).

- **Firebase Cloud Messaging (FCM)**  
  - Push notifications for: new whisper, whisper played, whisper approved (match), new chat message, expiring whisper.

- **Firebase AI Logic + Gemini** (for safety checks)  
  - Multimodal analysis of whisper audio.  
  - Stores safety decision/score into Firestore on whisper documents.  
  - No automated rewriting of content—detect-only per spec.

- **Optional later**  
  - **Firebase Analytics** for funnel metrics.  
  - **Remote Config** for tuning quotas, expiry windows, etc. (e.g., 5 → 7 whispers/day).

---

## 2. High-Level Domain Model

### 2.1 Core Entities

- **User** – Authenticated person with a profile & settings.  
- **Profile/feed surface** – Public-ish subset of user data used for discovery.  
- **Whisper** – Polite audio (or text fallback) sent from one user to another, with safety + lifecycle state.  
- **Match** – Mutual approval based on a whisper; unlocks chat.  
- **Message** – Chat message between matched users; may include media.  
- **Usage & Stats** – Per-user counters (daily whisper limit, private play/approve stats).  
- **Report & Block** – Moderation entities and relationships.  
- **Notification token** – Device tokens for FCM.

### 2.2 Relationships (Conceptual)

```text
User ─┬─ has profile data (Firestore `users/{uid}`)
      ├─ has many Whispers sent (`whispers` where senderId == uid)
      ├─ has many Whispers received (`whispers` where receiverId == uid)
      ├─ is participant in many Matches (`matches` with participantIds contains uid)
      ├─ has many Messages in each Match (`matches/{matchId}/messages`)
      ├─ has Usage docs for quotas (`users/{uid}/dailyUsage/{date}`)
      ├─ has Stats docs (`users/{uid}/stats/*`)
      ├─ can Block other users (`users/{uid}/blockedUsers/{blockedUid}`)
      └─ has Notification tokens (`users/{uid}/pushTokens/{tokenId}`)

Whisper ─→ may create Match (on approve) ─→ unlocks Chat messages
```

---

## 3. Firestore Schema

> **Note:** All timestamps are stored as Firestore `Timestamp`.  
> All IDs mentioned as `...Id` are string IDs, often matching document IDs (e.g., `uid`, `whisperId`, `matchId`).

### 3.1 `users` Collection

**Path:** `users/{uid}`  
**Doc ID:** Firebase Auth `uid`.

#### 3.1.1 Fields (top-level)

- `displayName: string`  
  - From Auth or X OAuth; user-editable.
- `age: number`  
  - Validated 18+.
- `gender: string`  
  - Enum: `"male" | "female" | "non_binary" | "prefer_not_to_say"`.
- `orientation: string`  
  - Enum: `"straight" | "gay" | "bi" | "pan" | "ace" | "other"`.
- `location: { city: string; countryCode: string; lat?: number; lng?: number; geoHash?: string }`  
  - City-only for display and simple proximity filters.  
  - `lat/lng/geoHash` reserved for future geo queries.
- `photos: Array<{
    id: string;              // random ID per photo
    storagePath: string;     // `user_photos/{uid}/{photoId}.jpg`
    isPrimary: boolean;
    createdAt: Timestamp;
  }>`
- `bio: string` (0–150 chars).
- `interests: string[]`  
  - 3–5 tags from predefined list.
- `dealBreakers: string[]`  
  - e.g., `['no_smokers', 'no_kids']`.
- `openToWhispers: boolean`  
  - Controls whether new whispers are accepted.
- `hideLocation: boolean`  
  - If true, show "Nearby" instead of city.
- `profileCompleted: boolean`  
  - Indicates user finished initial onboarding.
- `createdAt: Timestamp`  
- `updatedAt: Timestamp`  
- `lastActiveAt: Timestamp`  
  - For lightweight online/recency signals.

> **Privacy note:** Google account email and other auth data remain in Firebase Auth; Firestore `users` data is profile-level and may be readable by other users subject to security rules.

#### 3.1.2 Subcollection: `users/{uid}/settings`

**Doc:** `users/{uid}/settings/app`

Fields:

- `notifications: {
    newWhisper: boolean;
    whisperPlayed: boolean;
    whisperApproved: boolean;
    newMessage: boolean;
    quietHours: { start: string; end: string } | null; // e.g. "22:00"–"08:00"
  }`
- `privacy: {
    openToWhispers: boolean;   // mirror of main flag, for UX grouping
    locationPrecision: 'city' | 'nearby';
  }`
- `account: {
    dataExportRequestedAt?: Timestamp;
    deleteRequestedAt?: Timestamp;
  }`

#### 3.1.3 Subcollection: `users/{uid}/pushTokens`

**Path:** `users/{uid}/pushTokens/{tokenId}`

Fields:

- `token: string` (FCM token).  
- `platform: 'web' | 'ios' | 'android'` — for the MVP, only `'web'` will actually be used; `'ios'`/`'android'` are reserved for potential future native apps.  
- `createdAt: Timestamp`.  
- `lastUsedAt: Timestamp`.

Used to send targeted notifications and to clean up stale tokens.

#### 3.1.4 Subcollection: `users/{uid}/blockedUsers`

**Path:** `users/{uid}/blockedUsers/{blockedUid}`  
**Doc ID:** `blockedUid`.

Fields:

- `blockedAt: Timestamp`.  
- `reason: 'harassment' | 'spam' | 'fake' | 'other' | null`.

This subcollection is referenced when sending whispers, showing feeds, and creating matches to respect blocks.

#### 3.1.5 Subcollection: `users/{uid}/dailyUsage`

**Path:** `users/{uid}/dailyUsage/{yyyymmdd}`  
**Doc ID example:** `"2025-11-17"`.

Fields:

- `date: string` – ISO date (`YYYY-MM-DD`).  
- `whispersSent: number` – count of whispers sent that day.  
- `whisperLimit: number` – typically `5`, configurable via Remote Config.  
- `lastUpdatedAt: Timestamp`.

This doc is updated in a transaction or via a callable Cloud Function during the "Send Whisper" flow to enforce **5 clips/day**.

#### 3.1.6 Subcollection: `users/{uid}/stats`

**Doc:** `users/{uid}/stats/whispers`

Fields:

- `totalSent: number`.  
- `totalPlayed: number`.  
- `totalApproved: number`.  
- `rollingWindowDays: number` – e.g., 7.  
- `windowStartAt: Timestamp`.  
- `windowEndAt: Timestamp`.  
- `updatedAt: Timestamp`.

These stats feed the **private play score dashboard** (Epic 3.3). May be updated by Cloud Functions on whisper status changes.

#### 3.1.7 Subcollection: `users/{uid}/feedInteractions`

**Path:** `users/{uid}/feedInteractions/{targetUid}`

Fields:

- `targetUserId: string`.  
- `lastAction: 'viewed' | 'liked' | 'passed'`.  
- `lastActionAt: Timestamp`.  
- `likeCount: number`.  
- `passCount: number`.  
- `interestsSnapshot: string[]` – interests of target at interaction time.

Used for lightweight feed personalization and to avoid re-surfacing already passed profiles too aggressively.

---

### 3.2 `whispers` Collection

**Path:** `whispers/{whisperId}`  
**Doc ID:** random ID (not tied to sender/receiver IDs for safety and flexibility).

#### 3.2.1 Fields

- `senderId: string` – `uid` of initiator.  
- `receiverId: string` – `uid` of recipient.  
- `status: 'queued' | 'delivered' | 'played' | 'approved' | 'declined' | 'expired'`.  
  - `queued` – created, not yet shown to receiver.  
  - `delivered` – visible in receiver inbox.  
  - `played` – receiver played audio.  
  - `approved` – receiver approved; a `match` created.  
  - `declined` – receiver declined; hidden from inbox.  
  - `expired` – auto-expired after 48h unplayed.
- `deliveryChannel: 'audio' | 'text_fallback'`.  
- `audio: {
    storagePath: string;        // `whispers_audio/{whisperId}.m4a`
    durationSeconds: number;
    sizeBytes?: number;
    mimeType?: string;          // e.g. `audio/m4a`
  } | null`
- `textFallback: {
    text: string;
  } | null`
- `requireMagicPhrase: boolean` – whether "May I meet you because..." requirement is active for this whisper (on by default).  
- `magicPhrasePresent: boolean` – result of client or server validation.
- `safety: {
    checked: boolean;
    decision: 'pass' | 'flagged' | 'error' | null;
    score: number | null;       // 0–1
    flags: string[];            // e.g. ['harassment', 'explicit']
    engine: string | null;      // e.g. `gemini-2.5-flash`
    checkedAt: Timestamp | null;
  }`
- `inbox: {
    // For receiver view and expiry logic
    deliveredAt: Timestamp | null;
    expiresAt: Timestamp | null;     // ~48h after deliver
  }`
- `lifecycle: {
    createdAt: Timestamp;
    playedAt?: Timestamp;
    approvedAt?: Timestamp;
    declinedAt?: Timestamp;
    expiredAt?: Timestamp;
  }`
- `deleteAfter: Timestamp`  
  - Set to **7 days after creation** for unmatched whispers to support TTL or cleanup jobs.
- `playStatusForSender: 'not_played' | 'played_not_approved' | 'approved'`  
  - Denormalized for quick "My Whispers" summaries.

#### 3.2.2 Subcollection: `whispers/{whisperId}/events` (optional for analytics)

Fields per event doc:

- `type: 'created' | 'safety_checked' | 'delivered' | 'played' | 'approved' | 'declined' | 'expired'`.  
- `actorId: string | null`.  
- `createdAt: Timestamp`.  
- `metadata: { [key: string]: any }` – extra details as needed.

Used for debugging, analytics, and future scoring improvements. Not required for core functionality.

#### 3.2.3 Key Queries & Indexes

- **Receiver inbox:**
  - Query: `where('receiverId', '==', uid).where('status', 'in', ['delivered', 'queued']).orderBy('lifecycle.createdAt', 'desc').limit(10)`  
  - Index: composite on `receiverId`, `status`, `lifecycle.createdAt (desc)`.

- **My whispers (sender view / stats):**
  - Query: `where('senderId', '==', uid).orderBy('lifecycle.createdAt', 'desc').limit(50)`  
  - Index: composite on `senderId`, `lifecycle.createdAt (desc)`.

---

### 3.3 `matches` Collection

**Path:** `matches/{matchId}`  
**Doc ID:** random ID.

A match is created when a receiver approves a whisper.

#### 3.3.1 Fields

- `participantIds: string[]` – always length 2, contains both `uid`s.  
- `participants: {
    [uid: string]: {
      displayName: string;
      photoUrl?: string;     // primary photo URL for faster chat list
    }
  }` – denormalized snapshot for faster chat lists.  
- `whisperId: string` – the whisper that led to the match.  
- `createdAt: Timestamp`.  
- `lastMessageAt: Timestamp | null`.  
- `status: 'active' | 'archived' | 'blocked'`.  
  - `archived` – auto after 14 days inactivity; can be unarchived.  
  - `blocked` – if a participant blocks the other from within chat.
- `howWeMet: {
    whisperAudioPath?: string;   // from `whispers.audio.storagePath`
    senderId: string;
  }`

#### 3.3.2 Subcollection: `matches/{matchId}/messages`

**Path:** `matches/{matchId}/messages/{messageId}`  
**Doc ID:** random ID.

Fields:

- `senderId: string`.  
- `type: 'text' | 'image' | 'audio' | 'system'`.  
- `text?: string`.  
- `media?: {
    storagePath: string;       // `chat_media/{matchId}/{messageId}/...`
    mimeType: string;
    sizeBytes?: number;
    durationSeconds?: number;  // for audio
    thumbnailPath?: string;
  }`.  
- `createdAt: Timestamp`.  
- `editedAt?: Timestamp`.  
- `deletedFor?: string[]` – optional soft delete per user.  
- `systemPayload?: { [key: string]: any }` – for system messages (e.g., "Chat archived").

#### 3.3.3 Key Queries & Indexes

- **List user matches:**
  - Query: `where('participantIds', 'array-contains', uid).where('status', '==', 'active').orderBy('lastMessageAt', 'desc')`.  
  - Index: composite on `participantIds (array)`, `status`, `lastMessageAt (desc)`.

- **Chat messages:**
  - Query: `matches/{matchId}/messages.orderBy('createdAt', 'asc').limit(50)`  
  - Index: single-field on `createdAt` per subcollection (auto).

---

### 3.4 Moderation: `reports` Collection

**Path:** `reports/{reportId}`  
**Doc ID:** random ID.

Fields:

- `reportedUserId: string`.  
- `reportedByUserId: string`.  
- `context: {
    type: 'profile' | 'whisper' | 'message';
    profileUserId?: string;
    whisperId?: string;
    messageId?: string;
    matchId?: string;          // if message-related
  }`.  
- `reason: 'harassment' | 'spam' | 'fake' | 'other'`.  
- `note?: string`.  
- `createdAt: Timestamp`.  
- `status: 'open' | 'under_review' | 'resolved' | 'dismissed'`.  
- `resolvedAt?: Timestamp`.  
- `resolutionNote?: string`.

This collection is only readable/writable by moderators/admins, except that users can create reports and see their own submissions (configurable in security rules).

Index: `where('reportedUserId', '==', uid)` for moderation dashboards.

---

### 3.5 Other Supporting Collections

Depending on implementation details, these may be helpful:

#### 3.5.1 `notificationLogs` (optional)

**Path:** `notificationLogs/{logId}`

Fields:

- `userId: string`.  
- `type: 'new_whisper' | 'whisper_played' | 'whisper_approved' | 'new_message' | 'expires_soon'`.  
- `payload: { [key: string]: any }`.  
- `status: 'queued' | 'sent' | 'failed'`.  
- `createdAt: Timestamp`.  
- `sentAt?: Timestamp`.  
- `errorMessage?: string`.

Useful for debugging and analytics, but not required for MVP.

#### 3.5.2 `adminConfig` (optional)

**Path:** `adminConfig/global`

Fields:

- `whisperDailyLimitDefault: number` – e.g., 5.  
- `whisperUnplayedExpiryHours: number` – e.g., 48.  
- `whisperUnmatchedDeleteDays: number` – e.g., 7.  
- `safetyThreshold: number` – e.g., 0.2.  
- `minClipSeconds: number` – e.g., 5.  
- `maxClipSeconds: number` – e.g., 45.

Can be mirrored with Remote Config for client-side use.

---

## 4. Storage Buckets & File Layout

**Default bucket:** `gs://{PROJECT_ID}.appspot.com`

### 4.1 User Photos

- **Path pattern:** `user_photos/{uid}/{photoId}.jpg`  
- Linked from `users/{uid}.photos[].storagePath`.

Access rules:

- Owner can upload/delete.  
- Other users can read (subject to profile visibility rules).  
- NSFW or invalid files may be auto-flagged/removed by moderation tools.

### 4.2 Whisper Audio

- **Path pattern:** `whispers_audio/{whisperId}.m4a`

Access rules:

- **Sender & receiver** may read while whisper is active.  
- After 7 days if unmatched or once deleted/expired, access denied and file removed by scheduled cleanup.

### 4.3 Chat Media

- **Path pattern:** `chat_media/{matchId}/{messageId}/{filename}`

Access rules:

- Only match participants can read/write.  
- Deleted messages should trigger cleanup of associated media.

### 4.4 Safety & Compliance

- Optionally store **no raw AI analysis logs** in Storage; use Firestore `whispers.safety` fields instead, keeping data minimal and anonymized.

---

## 5. Authentication & User Lifecycle

### 5.1 Auth Providers

- **Google Sign-In:** single authentication method for all users.

### 5.2 Mapping Auth → Firestore

On sign-up / first login:

1. Create `users/{uid}` doc if not exists with:
   - `displayName`, `createdAt`, `profileCompleted = false`, `openToWhispers = true`.  
2. Redirect to **Profile Setup** flow which writes required fields.  
3. After completion, set `profileCompleted = true` and redirect to **Feed**.

On login:

- Update `lastActiveAt`.  
- Optionally mirror updated display name/photo from Auth provider.

On delete account:

- Mark `users/{uid}` as soft-deleted (e.g., `isDeleted = true`) before background cleanup removes profile, whispers, matches, and media.

---

## 6. Core Flows Mapped to Data

### 6.1 Feed & Discovery (Epic 1.2)

**Goal:** Show 10–20 curated profiles/day per user.

**Data used:**

- `users` collection for profiles & filters.  
- `users/{uid}/feedInteractions` for personalization and quota.  
- `users/{uid}/dailyUsage` for per-day feed limits if implemented.

**Typical query (simplified):**

- `where('openToWhispers', '==', true)`  
- `where('profileCompleted', '==', true)`  
- Optional: `where('orientation', 'in', [compatibleOptions])`  
- Optional: `where('location.city', '==', userCity)`  
- Randomization & interest bias implemented in client or Functions, not strictly in Firestore queries.

### 6.2 Record & Send Whisper (Epics 2.1–2.3)

1. **Client:** records audio and uploads to `whispers_audio/{whisperId}.m4a`.  
2. **Client or callable Function:** invokes AI Logic for safety:  
   - Sends audio to Gemini → gets decision/score.  
   - Writes `whispers/{whisperId}` with `safety` fields.  
3. **Callable Function `sendWhisper` (recommended):**
   - Checks `users/{senderId}.openToWhispers` (sender irrelevant; ensure they have a profile).  
   - Checks `users/{receiverId}.openToWhispers`.  
   - Checks block relationship using `users/{receiverId}/blockedUsers/{senderId}`.  
   - Enforces daily limit via `users/{senderId}/dailyUsage/{today}` in a transaction.  
   - If allowed & safety decision is `pass`, sets:
     - `status = 'delivered'`.  
     - `inbox.deliveredAt` and `inbox.expiresAt (~+48h)`.
4. **Cloud Function:** sends FCM `new_whisper` to receiver’s tokens.

### 6.3 Receive & Respond to Whisper (Epic 3)

1. **Inbox screen:**
   - Query `whispers` by `receiverId` and `status in ['queued','delivered']`.  
   - Show card info using `senderId` → `users/{senderId}`.
2. **On open:** show full sender profile, then allow play.  
3. **On play:**
   - Update `status = 'played'`, `lifecycle.playedAt`.  
   - Update `playStatusForSender` accordingly.  
   - Increment sender’s `users/{senderId}/stats/whispers.totalPlayed`.  
   - Send FCM `whisper_played` to sender.
4. **On approve:**
   - Transaction: create `matches/{matchId}`, mark `whispers/{whisperId}.status = 'approved'`, set `lifecycle.approvedAt`.  
   - Update sender stats `totalApproved`.  
   - Send FCM `whisper_approved` to both participants.  
   - Client navigates them to `matches/{matchId}/messages`.
5. **On decline:**
   - Set `status = 'declined'`, `lifecycle.declinedAt`.  
   - Optionally create `whispers/{whisperId}/events` with decline reason.  
   - No notification to sender.

### 6.4 Chat & Engagement (Epic 4)

1. **On match creation:**
   - `matches/{matchId}` created with `participantIds`, `whisperId`, `howWeMet`.  
   - Optionally create system message "You matched!" in `messages` subcollection.
2. **Chat screen:**
   - List matches: query `matches` by `participantIds array-contains uid`.  
   - For selected match, listen to `matches/{matchId}/messages` ordered by `createdAt`.
3. **New message:**
   - Client writes new doc in `messages` with `senderId`, `text`/`media`, `createdAt`.  
   - Cloud Function updates `matches/{matchId}.lastMessageAt` and sends `new_message` FCM to the other participant.
4. **Archiving:**
   - Scheduled Function sets `status = 'archived'` for matches with `lastMessageAt` older than 14 days.  
   - Client hides archived chats by default; optional "Archived" tab.

---

## 7. Moderation & Safety Data

### 7.1 Gemini Safety Pipeline

- Moderation uses **Firebase AI Logic + Gemini** with:
  - Input: whisper audio.  
  - Output stored in `whispers.safety` fields.  
  - Only high-level category flags and scores; no raw transcription unless required.

### 7.2 Reporting & Blocking

- **Blocking:**
  - Relationship stored in `users/{uid}/blockedUsers/{blockedUid}`.  
  - Enforced in whisper send, feed, and match/chat queries.

- **Reporting:**
  - Users can report profiles, whispers, or messages → creates `reports/{reportId}`.  
  - Moderation dashboards query by `reportedUserId` and `status`.  
  - Auto-actions (e.g., 3 reports → temp suspend) may be encoded as state on `users/{uid}` or separate `moderationState` document.

### 7.3 Deletion Policies

- **Unplayed whispers:**
  - Marked `status = 'expired'` after 48h; optional soft fade in UI before.  
  - Scheduled Function sets `expiredAt` and may later clean up data/media.

- **Unmatched old whispers:**
  - After 7 days, scheduled job:
    - Deletes `whispers/{whisperId}` or marks as archived.  
    - Deletes `whispers_audio/{whisperId}.m4a` from Storage.

- **Account deletion:**
  - On user delete, background cleanup removes or anonymizes:
    - Profile (`users/{uid}`).  
    - Whispers (as sender or receiver).  
    - Matches & chat messages.

---

## 8. Security Rules (High-Level Plan)

> This section describes **rule intent**, not final rule text.

### 8.1 Collections & Access

- `users/{uid}`
  - **Read:**
    - Public profile fields readable by any authenticated user.  
    - Sensitive fields (if any) restricted to owner and admins.  
  - **Write:**
    - Only owner `uid` or admins.

- `users/{uid}/settings/*`, `users/{uid}/pushTokens/*`, `users/{uid}/dailyUsage/*`, `users/{uid}/stats/*`, `users/{uid}/blockedUsers/*`
  - **Read/Write:** only owner `uid` and admin backends.

- `whispers/{whisperId}`
  - **Create:** only via controlled flow (client or callable Function) for `senderId == auth.uid`.  
  - **Read:** only `senderId` and `receiverId`.  
  - **Update:**
    - Sender can update only certain fields before send (e.g., re-record).  
    - Receiver can only update fields like `status` to `played`/`approved`/`declined`.  
    - System fields (`safety`, `deleteAfter`) writable only by Cloud Functions.

- `matches/{matchId}` & `matches/{matchId}/messages/{messageId}`
  - **Read/Write:** only if `auth.uid` is in `participantIds`.  
  - System-only updates on `status`, `lastMessageAt` via Functions or Admin SDK.

- `reports/{reportId}`
  - **Create:** any authenticated user can create a new report.  
  - **Read:** only moderators/admins (or optionally the reporter for their own reports).  
  - **Update:** only moderators/admins.

- `notificationLogs` & `adminConfig`
  - **Read/Write:** restricted to admin roles.

### 8.2 Personal vs Public Data Strategy

Given most fields in `users` are intended for display in the feed, the design:

- Keeps the Google account email and other sensitive identifiers out of Firestore and in Auth only.  
- Treats `users` as mostly public-but-authenticated data, with specific restrictions around settings and moderation.  
- Uses nested collections for private, per-user config and usage counters.

---

## 9. Implementation Notes for Next.js

### 9.1 Client vs Server Responsibility

- **Client (Next.js pages/components):**
  - Reads public `users` docs for feed & profiles.  
  - Reads/writes chat messages for active matches.  
  - Uploads media to Storage using Firebase client SDK.

- **Server (Next.js API routes or Cloud Functions callable endpoints):**
  - Implements `sendWhisper` pipeline and daily limits.  
  - Implements whisper approval → match creation → notifications.  
  - Implements scheduled jobs (cron) for expiry and cleanup.  
  - Handles any operation requiring server-side secrets or elevated access (e.g., AI Logic invocation with service account, moderation tools).

### 9.2 Real-Time UX

- Whispers inbox and chat views can use Firestore listeners for live updates.  
- Notification taps (from FCM) deep-link to whisper or chat documents.

---

## 10. MVP vs Future Extensions

### 10.1 MVP Scope (Aligned with Epics 1–3 + basic 4 & 5)

- Implement all collections & fields marked above.  
- Implement quota, safety, and expiry as outlined.  
- Basic chat (text + images) with pinned "How we met" clip.

### 10.2 Future Enhancements

- **Richer analytics:**
  - Additional `events` subcollections or BigQuery export.  
- **Scoring/Ranking:**
  - More detailed `feedInteractions` and `whispers` outcomes to train matching logic.  
- **A/B testing:**
  - Remote Config tied to `adminConfig` for whisper limits, expiry times, etc.

---

**End of document.**
