// Core data models for MayIMeetYou app

import { Timestamp } from 'firebase/firestore';

// User Profile Model
export interface UserProfile {
  uid: string;
  displayName: string;
  age: number;
  gender: 'male' | 'female' | 'non_binary' | 'prefer_not_to_say';
  orientation: 'straight' | 'gay' | 'bi' | 'pan' | 'ace' | 'other';
  location: {
    city: string;
    countryCode: string;
    lat?: number;
    lng?: number;
    geoHash?: string;
  };
  photos: Photo[];
  bio: string; // 0-150 chars
  interests: string[];
  dealBreakers: string[];
  openToWhispers: boolean;
  hideLocation: boolean;
  profileCompleted: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastActiveAt: Timestamp;
}

export interface Photo {
  id: string;
  storagePath: string;
  isPrimary: boolean;
  createdAt: Timestamp;
}

// Whisper Model
export interface Whisper {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'queued' | 'delivered' | 'played' | 'approved' | 'declined' | 'expired';
  deliveryChannel: 'audio' | 'text_fallback';
  audio?: AudioMetadata;
  textFallback?: string;
  requireMagicPhrase: boolean;
  magicPhrasePresent: boolean;
  safety: SafetyCheck;
  inbox: InboxInfo;
  lifecycle: LifecycleInfo;
  deleteAfter: Timestamp;
  playStatusForSender: 'not_played' | 'played_not_approved' | 'approved';
}

export interface AudioMetadata {
  storagePath: string;
  durationSeconds: number;
  sizeBytes?: number;
  mimeType?: string;
}

export interface SafetyCheck {
  checked: boolean;
  decision: 'pass' | 'flagged' | 'error' | null;
  score: number | null;
  flags: string[];
  engine: string | null;
  checkedAt: Timestamp | null;
}

export interface InboxInfo {
  deliveredAt: Timestamp | null;
  expiresAt: Timestamp | null;
}

export interface LifecycleInfo {
  createdAt: Timestamp;
  playedAt?: Timestamp;
  approvedAt?: Timestamp;
  declinedAt?: Timestamp;
  expiredAt?: Timestamp;
}

// Match Model
export interface Match {
  id: string;
  participantIds: string[];
  participants: Record<string, MatchParticipant>;
  whisperId: string;
  createdAt: Timestamp;
  lastMessageAt: Timestamp | null;
  status: 'active' | 'archived' | 'blocked';
  howWeMet: HowWeMet;
}

export interface MatchParticipant {
  displayName: string;
  photoUrl?: string;
}

export interface HowWeMet {
  whisperAudioPath?: string;
  senderId: string;
}

// Message Model
export interface Message {
  id: string;
  senderId: string;
  type: 'text' | 'image' | 'audio' | 'system';
  text?: string;
  media?: MediaAttachment;
  createdAt: Timestamp;
  editedAt?: Timestamp;
  deletedFor?: string[];
  systemPayload?: Record<string, any>;
}

export interface MediaAttachment {
  storagePath: string;
  mimeType: string;
  sizeBytes?: number;
  durationSeconds?: number; // for audio
  thumbnailPath?: string;
}

// Additional types for moderation and usage
export interface Report {
  id: string;
  reportedUserId: string;
  reportedByUserId: string;
  context: ReportContext;
  reason: 'harassment' | 'spam' | 'fake' | 'other';
  note?: string;
  createdAt: Timestamp;
  status: 'open' | 'under_review' | 'resolved' | 'dismissed';
  resolvedAt?: Timestamp;
  resolutionNote?: string;
}

export interface ReportContext {
  type: 'profile' | 'whisper' | 'message';
  profileUserId?: string;
  whisperId?: string;
  messageId?: string;
  matchId?: string;
}

// Usage and stats
export interface DailyUsage {
  date: string;
  whispersSent: number;
  whisperLimit: number;
  lastUpdatedAt: Timestamp;
}

export interface WhisperStats {
  totalSent: number;
  totalPlayed: number;
  totalApproved: number;
  rollingWindowDays: number;
  windowStartAt: Timestamp;
  windowEndAt: Timestamp;
  updatedAt: Timestamp;
}

// Feed interactions
export interface FeedInteraction {
  targetUserId: string;
  lastAction: 'viewed' | 'liked' | 'passed';
  lastActionAt: Timestamp;
  likeCount: number;
  passCount: number;
  interestsSnapshot: string[];
}

// Notification token
export interface PushToken {
  token: string;
  platform: 'web' | 'ios' | 'android';
  createdAt: Timestamp;
  lastUsedAt: Timestamp;
}

// Blocked user
export interface BlockedUser {
  blockedAt: Timestamp;
  reason?: 'harassment' | 'spam' | 'fake' | 'other' | null;
}

// Settings
export interface AppSettings {
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  account: AccountSettings;
}

export interface NotificationSettings {
  newWhisper: boolean;
  whisperPlayed: boolean;
  whisperApproved: boolean;
  newMessage: boolean;
  quietHours: { start: string; end: string } | null;
}

export interface PrivacySettings {
  openToWhispers: boolean;
  locationPrecision: 'city' | 'nearby';
}

export interface AccountSettings {
  dataExportRequestedAt?: Timestamp;
  deleteRequestedAt?: Timestamp;
}
