# MayIMeetYou App - Agile Development Backlog

**Version:** 1.0  
**Date:** November 17, 2025  
**Overview:** This document serves as the actionable backlog for our tech team to build the MVP of MayIMeetYou.app. It's structured around **Epics** (high-level themes grouping related features), **User Stories** (specific, user-focused tasks with acceptance criteria), and **User Flows** (step-by-step visualizations of key journeys). We've prioritized clarity: Each story includes who (persona), what (feature), why (benefit), and testable criteria. No assumptions—everything is explicit. Stories are prioritized (P0 = Launch Critical; P1 = MVP Polish; P2 = Post-Launch). Total estimated sprints: 4-6 weeks for MVP (assuming 2-week sprints). Free app only—no monetization features.

**Assumptions (To Avoid Confusion):**
- Users are authenticated via Google Sign-In only.
- App is a mobile-first responsive web app built with Next.js; works on desktop and mobile browsers (no separate native app for MVP).
- All features are bidirectional (any user can initiate/receive).
- Data privacy: GDPR-compliant; audios delete after 7 days if unmatched.
- No tech details (e.g., APIs, DB schemas)—focus on behavior.

**Prioritization Key:**
- P0: Must-have for launch (core loop: Browse → Record → Send → Receive → Chat).
- P1: Enhances usability/safety (e.g., limits, notifications).
- P2: Nice-to-have for retention (e.g., scores, sharing).

---

## Epic 1: User Onboarding & Profile Management (P0)
**Description:** New users sign up, build profiles, and discover potentials quickly. Goal: Frictionless entry to hook users in <2 minutes.  
**Business Value:** 80% of drop-off happens pre-profile; this gets users to first whisper fast.  
**Success Metrics:** 70% completion rate; average profile setup time <90s.

### User Story 1.1: Sign Up and Basic Profile Creation
**As a new user**, I want to sign up and create a basic profile so I can start browsing immediately without feeling overwhelmed.  
**Acceptance Criteria:**
- Supported method: Google Sign-In (pulls display name/photo if permitted).
- Required fields: Age (18+ validation), gender/orientation (dropdowns: Male/Female/Non-binary/Prefer not to say; Straight/Gay/Bi/Pan/Ace/Other), location (auto-detect via device, editable city-only for privacy).
- Optional: 1-5 photos (upload from gallery/camera; auto-crop/suggest best; max 5MB each; no NSFW auto-flag via basic ML if available).
- Bio: 0-150 characters (text only; no links).
- Interests: Select 3-5 from predefined tags (e.g., "Hiking", "Coffee", "Books"—20+ options; searchable).
- Deal-breakers: Toggle 1-3 (e.g., "No smokers", "Kids? Yes/No").
- Post-setup: Auto-redirect to browse feed; prompt "Toggle 'Open to Whispers'?" (default: Yes).
- Edge Cases: Sign-in errors → Suggest retry or support; Under 18 → Block with resources link.
- UI: Single-screen wizard with progress bar; skip option for optionals.

### User Story 1.2: Profile Discovery Feed
**As a signed-in user**, I want a curated feed of profiles so I can browse potentials based on compatibility without endless scrolling.  
**Acceptance Criteria:**
- Feed shows 10-20 profiles/day (algorithm: 70% interest match, 20% location <50km, 10% random for serendipity).
- Each card: Blurred photo teaser (unblurs on tap), name/age/location snippet, 1 interest badge, bio preview (first 50 chars + "Read more").
- Filters: Toggle by orientation/interests (persistent until cleared).
- Actions per card: "Whisper Hi" button (triggers Epic 2) or "Pass" (swipe left gesture).
- Refresh: Pull-to-refresh; no infinite load—daily reset to prevent fatigue.
- Personalization: After 5 interactions, refine feed (e.g., more "Coffee" if liked those).
- Edge Cases: No matches → Show "Expand filters?" or fun placeholder ("Your polite prince is out there—try tomorrow!").
- UI: Vertical scroll; card height fixed at 200px; accessibility: Alt text for images.

### User Story 1.3: Edit Profile Anytime
**As an existing user**, I want to update my profile so I can refine it based on feedback or mood.  
**Acceptance Criteria:**
- Accessible from settings/menu (top-right avatar tap).
- Same fields as signup; changes save instantly with confirmation toast ("Profile updated—fresh feed incoming!").
- Photo management: Add/delete/reorder; enforce 1-5 limit.
- Privacy toggles: "Open to Whispers" (global on/off); hide location (shows "Nearby" instead).
- Edge Cases: Bio over 150 chars → Truncate with warning; invalid photo → Reject upload.
- UI: Modal sheet; preview button to see live changes.

---

## Epic 2: Whisper Creation & Sending (P0)
**Description:** Core initiation: Record, check, and send audio openers. Enforces politeness while keeping it fun and safe.  
**Business Value:** This is the app's soul—effortful "May I?" clips filter for quality.  
**Success Metrics:** 60% of sent clips get played; average clip length 20-30s.

### User Story 2.1: Record a Whisper Clip
**As an initiator**, I want to record a short audio clip starting with the required phrase so I can express genuine interest without overthinking.  
**Acceptance Criteria:**
- Trigger: Tap "Whisper Hi" on a profile card.
- Recording: One-tap mic button; max 45 seconds (visual timer bar; auto-stop at limit).
- Required Start: Must begin with exact phrase "May I meet you because..." (app listens post-record; if missing, prompt "Add the magic words?" with re-record nudge—non-blocking).
- Content: Free-form after phrase (e.g., tie to their bio/interests); no text overlay needed.
- Controls: Pause/resume; preview playback; unlimited re-records (discard button clears).
- Offline Support: Record offline; queue for upload on connect.
- Edge Cases: Mic permission denied → Fallback to text note (but flag as "low-effort"); <5s clip → Warn "Too short—add a why?".
- UI: Full-screen modal; waveform visualizer; "Send" disabled until previewed.

### User Story 2.2: Safety Check with Gemini
**As the app**, I want to automatically scan clips for inappropriate content before sending so the community stays safe and positive.  
**Acceptance Criteria:**
- Post-preview: Auto-run Google Gemini API on audio transcription (speech-to-text first, then analyze).
- Checks: Detect profanity, threats, harassment, explicit references (e.g., score 0-1; threshold >0.2 = flag).
- Outcomes:
  - Pass: Instant green check ("All good—sending!"); proceed to send.
  - Fail: Soft block modal ("This might not land right—try re-recording?") with generic tips (e.g., "Keep it light and positive"); no specifics to avoid bias.
- Logging: Anonymized flags to backend for manual review (e.g., 3+ flags → temp ban).
- No Improv: Gemini only detects—does not suggest rewrites or edits.
- Edge Cases: API downtime → Queue and retry; non-English clips → Basic English fallback (expand later).
- Performance: <5s scan time; user sees spinner ("Quick vibe check...").

### User Story 2.3: Send and Daily Limits
**As an initiator**, I want to send clips with soft limits so I focus on quality over quantity.  
**Acceptance Criteria:**
- Post-safety pass: Tap "Send" → Confirmation toast ("Whisper sent—fingers crossed!"); clip queues to receiver's inbox.
- Limit: 5 clips/day (resets at midnight UTC); visual counter in header ("3/5 left").
- Exceeded: Gentle block ("Daily whispers maxed—come back tomorrow for more magic!"); no hard paywall.
- Notifications: Push alert on send ("Your whisper is en route!").
- Edge Cases: Receiver blocks you → Clip auto-fails silently; network fail → Retry prompt.
- UI: Send button pulses green on pass; limit badge in nav bar.

---

## Epic 3: Receiving & Responding to Whispers (P0)
**Description:** Receivers control the flow—preview, play, approve/decline—to ensure empowerment.  
**Business Value:** Builds trust; high approval rates drive retention.  
**Success Metrics:** 40% approval rate; <10% reports.

### User Story 3.1: Inbox for Incoming Whispers
**As a receiver**, I want a dedicated inbox so I can manage potential connections at my pace.  
**Acceptance Criteria:**
- Accessible via bottom nav ("Whispers" tab); shows unread count badge.
- List View: 5-10 cards max (sorted newest first); each: Sender's profile teaser (photo/name/age), timestamp, "Play?" button.
- Digest Mode: If >5, group as "3 new whispers today" expandable accordion.
- Auto-Expire: Unplayed clips fade after 48 hours (notify: "This whisper expires soon—peek?").
- Edge Cases: "Open to Whispers" off → No inbox; reroute to settings.
- UI: Clean list; tap card → Full preview modal (profile + play button).

### User Story 3.2: Play and Approve a Whisper
**As a receiver**, I want to preview the sender's profile before playing so I feel in control.  
**Acceptance Criteria:**
- From inbox/teaser: Mandatory profile view first (full bio/photos/interests).
- Play Button: Tap → Audio plays (with waveform/controls: play/pause/volume); notifies sender instantly ("Your whisper was played!" +1 to private score).
- Post-Play Actions:
  - Approve: Green button ("Yes, let's chat!") → Mutual match; unlocks chat; notify both ("They approved—say hi!").
  - Decline: Red X ("Not for me") → Clip deletes; no notification to sender; optional reason (anonymous feedback loop for app improvement).
  - Block: From profile → Permanent (hides future whispers; report to mods).
- Edge Cases: Play mid-audio → Resume from pause; dislike mid-play → Stop + decline.
- UI: Full-screen player overlay; auto-advance to actions on end.

### User Story 3.3: Private Play Score Tracking
**As an initiator**, I want a private view of my clip performance so I can build confidence without public pressure.  
**Acceptance Criteria:**
- Visible only to sender: In profile/settings ("My Whispers" tab); shows total plays (e.g., "12 whispers heard this week") and per-clip breakdown (e.g., "Clip to Alex: Played but not approved").
- Updates: Real-time push on play/approve.
- No Sharing: Purely personal—no leaderboards or exports.
- Edge Cases: Zero plays → Motivational tip ("Every whisper counts—keep going!").
- UI: Simple dashboard chart (bar for weekly total); reset option for new week.

---

## Epic 4: Chatting & Engagement (P1)
**Description:** Once matched, seamless messaging to nurture sparks.  
**Business Value:** Turns whispers into dates; boosts DAU.  
**Success Metrics:** 50% of matches send first message <24h.

### User Story 4.1: Unlock and Start Chat
**As a matched user**, I want an instant chat room so conversations flow naturally from the whisper.  
**Acceptance Criteria:**
- On approve: Auto-open chat modal; pre-load replay button for the original clip.
- Features: Text messaging (emoji/GIF support); voice notes (up to 60s, no "May I" req); photo sharing (1 per message, moderated).
- Threaded: Replies nest under originals; search by keyword.
- Edge Cases: Unread count in nav; archive inactive chats after 14 days.
- UI: Familiar messenger style (bubbles, typing indicator); pinned "How we met" with clip.

### User Story 4.2: Notifications & Reminders
**As any user**, I want timely push notifications so I don't miss connections.  
**Acceptance Criteria:**
- Types: New whisper (teaser only), Play confirmation, Approve/match, New message.
- Customizable: In settings (on/off per type; quiet hours 10PM-8AM).
- Edge Cases: Do Not Disturb → Delay to morning; battery saver → Batch.
- UI: Rich previews (e.g., "Your whisper to Jordan was played!").

---

## Epic 5: Safety, Settings & Moderation (P1)
**Description:** Backend guards for trust; user controls for comfort.  
**Business Value:** Low reports = high trust = viral growth.

### User Story 5.1: Reporting & Blocking
**As any user**, I want easy tools to report/block so I feel protected.  
**Acceptance Criteria:**
- Per-profile: Block (hides all future) or Report (dropdown: Harassment/Spam/Fake; optional text).
- Auto-Actions: 3 reports → Temp suspend (24h); notify mods.
- Feedback Loop: Anon aggregate (e.g., "We reviewed—thanks!").
- Edge Cases: Self-report glitch → Undo button.

### User Story 5.2: App-Wide Settings
**As a user**, I want centralized controls so I customize my experience.  
**Acceptance Criteria:**
- Sections: Privacy (whispers on/off, location precision), Notifications, Account (delete/export data).
- Logout/Delete: Full data wipe confirmation.
- UI: Scrollable list; toggles save instantly.

---

## High-Level User Flows
### Flow 1: End-to-End Whisper Journey (Core Loop)
```
1. User A opens app → Browses feed (Epic 1.2) → Taps profile → "Whisper Hi" (2.1)
2. Records clip ("May I meet you because...") → Previews → Gemini scans (2.2) → If pass: Sends (2.3) → Limit check OK
3. User B gets push → Opens inbox (3.1) → Views A's profile → Plays clip (3.2) → A notified (+1 score, 3.3)
4. B approves → Both notified → Chat unlocks (4.1) → Exchange messages
5. If decline: Clip deletes; A sees no update
(Branch: If limit hit → Daily cap message)
```

### Flow 2: Onboarding to First Send
```
1. Open mayimeetyou.app in a browser → Sign up (1.1: Google Sign-In → Basic profile) → "Open to Whispers?" toggle
2. Redirect to feed (1.2) → Browse 3 cards → Select one → Record/send first clip (Epic 2)
3. Success: Toast + score init (0 plays)
```

### Flow 3: Safety Fail Handling
```
1. Record → Preview → Gemini flag (2.2) → Modal: "Try again?" + tip
2. Re-record → Pass → Send
(If 3 fails/day → Soft warn: "Taking a breather?")
```

**Testing Notes:** Each story needs unit/integration tests (e.g., mock Gemini for CI); beta with 50 users for flow validation. Prioritize Epics 1-3 for alpha build.

This leaves zero gray areas—devs can quote stories directly for tasks. Ready to sprint? Or add P2 stories like "Share Funny Clips Anon"?