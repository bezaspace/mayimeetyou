# MayIMeetYou – Step‑by‑Step Development Plan (Feature‑First)

This document turns the `idea.md` backlog into a **chronological, feature‑oriented plan** for building the MVP.  
It’s organized into **phases → milestones → concrete steps**, aligned with the epics and user flows.

---

## Phase 0 – Foundations & Skeleton App

### Milestone 0.1 – Project & Environment Setup
- **0.1.1 – Create the core app**
  - Initialize the project (Next.js app, Firebase project).
  - Configure environments (dev/stage/prod), `.env` values, and secrets.
- **0.1.2 – Global UI shell**
  - Set up basic layout: header, navigation tabs (e.g., `Feed`, `Whispers`, `Profile`).
  - Add a simple theme (colors, typography, spacing) to keep the UI consistent.
- **0.1.3 – Routing & navigation**
  - Define initial routes/pages:
    - Auth / onboarding
    - Feed
    - Whispers (inbox)
    - Chat (placeholder)
    - Settings / profile
  - Hook up navigation between them (no real data yet).

### Milestone 0.2 – Core Data Models & Infrastructure
- **0.2.1 – User profiles**
  - Define a profile model that supports:
    - Age, gender, orientation, location, photos, bio, interests, deal‑breakers.
    - `openToWhispers` and other privacy toggles.
- **0.2.2 – Whisper clips**
  - Define a minimal whisper entity:
    - Sender, receiver, status (`queued`, `delivered`, `played`, `approved`, `declined`, `expired`).
    - Audio file metadata and safety check status/score.
- **0.2.3 – Matches & chats**
  - Define models for matches and chat messages (even if they’re not fully implemented yet).

**Exit criteria for Phase 0:**  
Basic app shell loads, routes exist, and core data models are decided (even if mocked).

---

## Phase 1 – Authentication & Basic Profile (Epic 1.1)

### Milestone 1.1 – User Authentication
- **1.1.1 – Auth method**
  - Implement Google Sign-In as the only authentication method.
- **1.1.2 – Session handling**
  - Persist auth state across page refreshes.
  - Protect authenticated routes (feed, whispers, profile, chat).

### Milestone 1.2 – Basic Profile Setup Flow
Covers **User Story 1.1**.

- **1.2.1 – Profile creation form (first‑time users)**
  - Required fields:
    - Age (validate 18+).
    - Gender and orientation (dropdowns with given options).
    - Location:
      - Auto-detect via device.
      - Allow editing city name only (no exact address).
  - Optional fields:
    - 1–5 photos (upload from device, enforce max size; basic NSFW guard if possible).
    - Short bio (0–150 chars, text only).
    - Interests (choose 3–5 from predefined list; searchable).
    - Deal‑breakers (1–3 toggles).
- **1.2.2 – UX details**
  - Single-screen wizard with:
    - Progress bar.
    - Clear primary action and a way to skip optional sections.
  - Edge cases:
    - Sign-in errors → show retry or support.
    - Under 18 → block with a “resources” link and explanation.
- **1.2.3 – Post-setup redirect**
  - After profile completion:
    - Prompt: “Open to Whispers?” (default ON).
    - Redirect to the **Feed** page.

### Milestone 1.3 – Edit Profile Anytime (Epic 1.3)
- **1.3.1 – Profile screen**
  - Accessible via avatar / settings icon (click).
  - Show all profile fields populated from backend.
- **1.3.2 – Editing experience**
  - Same fields as signup:
    - Instant save on change with confirmation toast (“Profile updated…”).
    - Photo management: add, delete, reorder; enforce 1–5 photos.
  - Privacy toggles:
    - `Open to Whispers` on/off.
    - Hide location (display “Nearby” instead).
- **1.3.3 – Validation**
  - Truncate bios >150 chars and show a warning.
  - Reject invalid photos (type/size failures).

**Exit criteria for Phase 1:**  
New users can sign up, create a basic profile, and return later to edit it.

---

## Phase 2 – Profile Discovery Feed (Epic 1.2)

### Milestone 2.1 – Feed Basics
- **2.1.1 – Feed layout**
  - Vertical scroll list of profile cards (fixed height ~200px).
  - Each card shows:
    - Blurred photo teaser (click to unblur).
    - Name, age, city snippet.
    - 1 interest badge.
    - Bio preview (first ~50 chars + “Read more”).
    - “Whisper Hi” button + “Pass” action.
- **2.1.2 – Feed retrieval**
  - For the MVP:
    - Return up to 10–20 profiles per day per user.
    - Basic matching logic (approximate):
      - Interest overlap.
      - Distance < ~50km where possible.
      - Some randomness to avoid repetition.

### Milestone 2.2 – Filters & Daily Reset
- **2.2.1 – Filters**
  - Filter by orientation and interests.
  - Make filters sticky until the user clears them.
- **2.2.2 – Daily quota behavior**
  - Limit visible profiles/day and reset quota at midnight (even if logic is simple).
  - Handle “no more profiles” state:
    - Suggest “Expand filters?” or show a charming empty state message.

### Milestone 2.3 – Interaction Tracking
- **2.3.1 – Like/Pass handling**
  - Selecting “Pass” should:
    - Remove the card from current view.
    - Store minimal interaction data (liked/passed) to refine future feeds.
- **2.3.2 – Simple personalization**
  - After a few interactions, bias the feed toward interests the user tends to like.

**Exit criteria for Phase 2:**  
Signed-in users with profiles see a daily feed, can filter it, and can click “Whisper Hi” to move into the core loop.

---

## Phase 3 – Whisper Recording, Safety, and Sending (Epic 2)

### Milestone 3.1 – Recording UX (User Story 2.1)
- **3.1.1 – Trigger & screen**
  - From a profile card, clicking “Whisper Hi” opens a full-screen recording modal.
- **3.1.2 – Recording controls**
  - Single big mic button:
    - Click → start/stop recording.
    - Max duration 45 seconds with visual timer.
  - Support:
    - Pause/resume if feasible.
    - Playback preview.
    - Discard and re‑record.
- **3.1.3 – Validation & nudges**
  - After recording, verify that the clip starts with “May I meet you because…”. If it appears missing, show a soft prompt to re‑record.
  - For clips <5 seconds → show warning (“Too short—add a why?”).
  - Handle mic permission denied:
    - Fallback to text note labeled clearly as low effort.

### Milestone 3.2 – Safety Check Pipeline (User Story 2.2)
- **3.2.1 – Multimodal safety analysis**
  - Send the recorded audio directly to the multimodal Gemini model (no separate transcription step).
  - The model evaluates the audio to detect:
    - Profanity, threats, harassment, explicit content.
  - Receive a safety score and decision.
- **3.2.3 – User feedback on safety**
  - If passed:
    - Show quick positive confirmation and allow sending.
  - If flagged:
    - Show a neutral, friendly modal:
      - “This might not land right—try re‑recording?”
      - Include generic tips (light, kind, respectful).
  - If safety service is down:
    - Queue or retry, and communicate clearly to the user.

### Milestone 3.3 – Send Flow & Daily Limits (User Story 2.3)
- **3.3.1 – Sending**
  - After safety pass and preview:
    - Enable `Send` button.
    - On click:
      - Persist whisper.
      - Show toast (“Whisper sent—fingers crossed!”).
- **3.3.2 – Daily limit**
  - Limit to 5 clips/day per user.
  - Show a visible counter (“3/5 left today”).
  - When limit exceeded:
    - Block send with a gentle message (“Daily whispers maxed—see you tomorrow!”).
- **3.3.3 – Error handling**
  - Network failure:
    - Retry prompt or queue for retry.
  - Receiver has blocked sender:
    - Fails silently; do not notify sender in a way that reveals the block.

**Exit criteria for Phase 3:**  
Users can record, safety-check, and send up to 5 polite audio whispers per day to others from the feed.

---

## Phase 4 – Receiving & Responding to Whispers (Epic 3)

### Milestone 4.1 – Whispers Inbox (User Story 3.1)
- **4.1.1 – Inbox screen**
  - Add “Whispers” tab to navigation tabs.
  - Show list of incoming whispers:
    - Unread badge on tab.
    - 5–10 cards sorted newest first.
- **4.1.2 – Card content & states**
  - Each card shows:
    - Sender teaser (photo, name, age).
    - Timestamp.
    - “Play?” call to action.
  - If >5 whispers:
    - Use a simple grouping (e.g., “3 new whispers today”) that can expand.
- **4.1.3 – Auto‑expire logic**
  - Whispers older than 48 hours and unplayed:
    - Mark as expiring or expired.
    - Send “expires soon” notification if applicable.
- **4.1.4 – Respect “Open to Whispers”**
  - When `openToWhispers` is OFF:
    - Do not show new whispers; prompt the user to enable it to receive new messages.

### Milestone 4.2 – Play & Decide (User Story 3.2)
- **4.2.1 – Pre‑play profile view**
  - Clicking an inbox card opens:
    - Sender’s full profile (photos, bio, interests).
    - Play button for the audio.
- **4.2.2 – Player UX**
  - Full-screen or modal audio player:
    - Waveform, play/pause, and a simple timeline.
  - When played:
    - Update whisper status to “played”.
    - Notify sender that it was played (+1 to their private play score).
- **4.2.3 – Action buttons**
  - After play (or at end):
    - Approve → creates mutual match and unlocks chat.
    - Decline → removes whisper and does NOT notify sender.
    - Block/report → permanently hide future whispers from that user and log report.
- **4.2.4 – Feedback loop**
  - Optionally collect anonymized decline reasons for analytics.

### Milestone 4.3 – Private Play Score (User Story 3.3)
- **4.3.1 – “My Whispers” dashboard**
  - Inside profile or settings:
    - Show total whispers sent.
    - Show total plays and approvals.
- **4.3.2 – Per‑clip status**
  - For each sent whisper, show a simple status:
    - “Sent, not yet played.”
    - “Played, not approved.”
    - “Approved – match created.”
- **4.3.3 – Motivation states**
  - If zero plays in a period:
    - Show a supportive tip rather than a harsh metric.

**Exit criteria for Phase 4:**  
Users can receive whispers, listen, approve/decline, and see basic performance stats on their own whispers.

---

## Phase 5 – Chatting & Engagement (Epic 4)

### Milestone 5.1 – Chat Unlock on Match (User Story 4.1)
- **5.1.1 – Match creation**
  - On approval:
    - Create a match record tying both users and the original whisper.
    - Notify both users and open a chat view.
- **5.1.2 – Chat interface**
  - Standard messenger layout:
    - Message bubbles.
    - Typing indicator.
    - Unread count/badges in navigation.
- **5.1.3 – Core chat features**
  - Text messages with emoji.
  - Basic media:
    - Photo sharing (1 per message, moderated).
  - Optional for MVP:
    - Voice notes up to 60s (no “May I…” requirement).

### Milestone 5.2 – Conversation Lifecycle
- **5.2.1 – How we met**
  - Pin the original whisper clip at the top of the chat (“How we met”).
- **5.2.2 – Archiving**
  - Auto-archive chats after 14 days of inactivity.
  - Provide a way to unarchive.

### Milestone 5.3 – Notifications & Reminders (User Story 4.2)
- **5.3.1 – Notification types**
  - New whisper.
  - Whisper played.
  - Whisper approved (match).
  - New chat message.
- **5.3.2 – Settings**
  - Let users enable/disable each notification type.
  - Add “quiet hours” range (e.g., 10 PM–8 AM).
- **5.3.3 – Special behaviors**
  - Respect OS “Do Not Disturb” where possible.
  - Batch notifications in low‑battery / low‑power contexts.

**Exit criteria for Phase 5:**  
Matches auto-create and lead into real conversations, with notifications that bring users back without being spammy.

---

## Phase 6 – Safety, Moderation & Settings (Epic 5)

### Milestone 6.1 – Reporting & Blocking (User Story 5.1)
- **6.1.1 – Per‑user actions**
  - On any profile or chat:
    - `Block` – hide all future whispers and chats from that user.
    - `Report` – choose a reason (Harassment, Spam, Fake, etc.).
- **6.1.2 – Moderation logic**
  - Track reports per user.
  - At a threshold (e.g., 3 reports), mark for review or apply temporary suspension.
- **6.1.3 – Feedback to reporters**
  - Show an anonymous, delayed acknowledgment:
    - “We reviewed your report. Thank you for keeping the community safe.”

### Milestone 6.2 – App‑Wide Settings (User Story 5.2)
- **6.2.1 – Settings screen**
  - Sections:
    - Privacy (whispers on/off, location precision).
    - Notifications (types, quiet hours).
    - Account (export/delete data, logout).
- **6.2.2 – Data actions**
  - Implement logout.
  - Implement account deletion with clear confirmation flow.
- **6.2.3 – Persistence**
  - Ensure settings are saved instantly and survive app restarts.

**Exit criteria for Phase 6:**  
Users can control their privacy, notifications, and account lifecycle; moderation workflows exist for harmful behavior.

---

## Phase 7 – Polishing, Testing & Beta Launch

### Milestone 7.1 – Flow Validation Against User Flows
- **7.1.1 – Flow 1: End‑to‑End Whisper Journey**
  - Test A→B flow:
    - Browse → record → safety check → send → inbox → play → approve → chat.
- **7.1.2 – Flow 2: Onboarding to First Send**
  - New user:
    - Signup → profile → feed → record/send first whisper.
- **7.1.3 – Flow 3: Safety fail handling**
  - Intentionally trigger flagged content and verify:
    - Modal prompt.
    - Re‑record path.
    - Soft warning after repeated fails.

### Milestone 7.2 – Testing Strategy
- **7.2.1 – Automated tests**
  - Unit tests for:
    - Profile validation.
    - Whisper limit logic.
    - Safety decision handling.
  - Integration tests for:
    - End‑to‑end whisper send/receive.
    - Match → chat sequence.
- **7.2.2 – Manual QA**
  - Test on multiple devices / viewport sizes.
  - Accessibility pass (screen readers, alt text, focus states).

### Milestone 7.3 – Beta & Analytics
- **7.3.1 – Beta cohort**
  - Invite ~50 users.
  - Observe:
    - Profile completion rate.
    - First whisper time after signup.
    - Whisper play and approval rates.
- **7.3.2 – Iterative improvements**
  - Based on metrics and feedback, refine:
    - Feed matching and limits.
    - Safety prompts.
    - Chat and notifications.

---

## How to Use This Plan

- **Build strictly phase by phase.**  
  Don’t start chat or notifications until whisper send/receive is solid.
- **Cut scope if needed by phase.**  
  For example, launch without voice notes in chat or detailed analytics, but keep the whisper loop flawless.
- **Turn each bullet into tickets.**  
  Each step above can become one or more dev tasks, mapped back to the original epics & user stories in `idea.md`.
