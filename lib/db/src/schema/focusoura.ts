import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  serial,
  json,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  userCode: integer("user_code").unique(),
  displayName: text("display_name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  avatarUrl: text("avatar_url"),
  role: text("role").notNull().default("student"),
  authProvider: text("auth_provider").notNull().default("email"),
  providerId: text("provider_id").unique(),
  studyMode: text("study_mode").notNull().default("light"),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerifiedAt: timestamp("email_verified_at"),
  selectedPetId: text("selected_pet_id").notNull().default("mochi"),
  unlockedPetIds: json("unlocked_pet_ids").$type<string[]>().notNull().default(["mochi"]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

export const subjectsTable = pgTable("subjects", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  accentColor: text("accent_color").notNull(),
  plantId: text("plant_id"),
  totalFocusMinutes: integer("total_focus_minutes").notNull().default(0),
  sessionCount: integer("session_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    userIdIdx: index("subjects_user_id_idx").on(table.userId),
  };
});

export const insertSubjectSchema = createInsertSchema(subjectsTable).omit({
  createdAt: true,
});
export type InsertSubject = z.infer<typeof insertSubjectSchema>;
export type Subject = typeof subjectsTable.$inferSelect;

export const plantsTable = pgTable("plants", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  subjectId: text("subject_id"),
  plantType: text("plant_type").notNull().default("fern"),
  growthLevel: integer("growth_level").notNull().default(1),
  growthPoints: integer("growth_points").notNull().default(0),
  maxGrowthPoints: integer("max_growth_points").notNull().default(100),
  // Set when a session on this plant is aborted, cleared by the next
  // completed one. Null means healthy.
  witheredAt: timestamp("withered_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    userIdIdx: index("plants_user_id_idx").on(table.userId),
    subjectIdIdx: index("plants_subject_id_idx").on(table.subjectId),
  };
});

export const insertPlantSchema = createInsertSchema(plantsTable).omit({
  createdAt: true,
});
export type InsertPlant = z.infer<typeof insertPlantSchema>;
export type Plant = typeof plantsTable.$inferSelect;

export const sessionsTable = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  subjectId: text("subject_id"),
  calendarItemId: text("calendar_item_id"),
  plantId: text("plant_id"),
  sessionType: text("session_type").notNull(),
  state: text("state").notNull().default("initialized"),
  durationMinutes: integer("duration_minutes").notNull(),
  pointsEarned: integer("points_earned").notNull().default(0),
  startTime: timestamp("start_time").notNull().defaultNow(),
  endTime: timestamp("end_time"),
  pausedAt: timestamp("paused_at"),
  totalPausedMs: integer("total_paused_ms").notNull().default(0),
  pauseCount: integer("pause_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    userIdIdx: index("sessions_user_id_idx").on(table.userId),
    subjectIdIdx: index("sessions_subject_id_idx").on(table.subjectId),
    calendarItemIdIdx: index("sessions_calendar_item_id_idx").on(table.calendarItemId),
    startTimeIdx: index("sessions_start_time_idx").on(table.startTime),
  };
});

export const insertSessionSchema = createInsertSchema(sessionsTable).omit({
  createdAt: true,
});
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessionsTable.$inferSelect;

export const sessionEventsTable = pgTable("session_events", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  userId: text("user_id").notNull(),
  eventType: text("event_type").notNull(),
  eventTime: timestamp("event_time").notNull().defaultNow(),
  metadata: json("metadata"),
}, (table) => {
  return {
    sessionIdIdx: index("session_events_session_id_idx").on(table.sessionId),
  };
});

export const insertSessionEventSchema = createInsertSchema(sessionEventsTable).omit({
  eventTime: true,
});
export type InsertSessionEvent = z.infer<typeof insertSessionEventSchema>;
export type SessionEvent = typeof sessionEventsTable.$inferSelect;

export const walletsTable = pgTable("wallets", {
  userId: text("user_id").primaryKey(),
  balance: integer("balance").notNull().default(0),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertWalletSchema = createInsertSchema(walletsTable).omit({
  lastUpdated: true,
});
export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Wallet = typeof walletsTable.$inferSelect;

export const transactionsTable = pgTable("transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  amount: integer("amount").notNull(),
  description: text("description").notNull(),
  referenceId: text("reference_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    userIdIdx: index("transactions_user_id_idx").on(table.userId),
  };
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({
  createdAt: true,
});
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;

export const motivationMessagesTable = pgTable("motivation_messages", {
  id: text("id").primaryKey(),
  content: text("content").notNull(),
  sessionId: text("session_id"),
  approved: boolean("approved").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMotivationMessageSchema = createInsertSchema(motivationMessagesTable).omit({
  createdAt: true,
});
export type InsertMotivationMessage = z.infer<typeof insertMotivationMessageSchema>;
export type MotivationMessage = typeof motivationMessagesTable.$inferSelect;

export const aiInsightsTable = pgTable("ai_insights", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    userIdIdx: index("ai_insights_user_id_idx").on(table.userId),
  };
});

export const insertAiInsightSchema = createInsertSchema(aiInsightsTable).omit({
  createdAt: true,
});
export type InsertAiInsight = z.infer<typeof insertAiInsightSchema>;
export type AiInsight = typeof aiInsightsTable.$inferSelect;

export const friendshipsTable = pgTable("friendships", {
  id: text("id").primaryKey(),
  requesterId: text("requester_id").notNull(),
  receiverId: text("receiver_id").notNull(),
  status: text("status").notNull().default("pending"),
  inviteToken: text("invite_token"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    requesterIdIdx: index("friendships_requester_id_idx").on(table.requesterId),
    receiverIdIdx: index("friendships_receiver_id_idx").on(table.receiverId),
  };
});

export const insertFriendshipSchema = createInsertSchema(friendshipsTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertFriendship = z.infer<typeof insertFriendshipSchema>;
export type Friendship = typeof friendshipsTable.$inferSelect;

export const challengesTable = pgTable("challenges", {
  id: text("id").primaryKey(),
  creatorId: text("creator_id").notNull(),
  title: text("title").notNull(),
  sessionType: text("session_type").notNull().default("homework"),
  durationMinutes: integer("duration_minutes").notNull().default(600),
  stake: integer("stake").notNull().default(0),
  status: text("status").notNull().default("open"),
  challengeType: text("challenge_type").notNull().default("competitive"),
  durationDays: integer("duration_days").notNull().default(7),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  winnerId: text("winner_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    creatorIdIdx: index("challenges_creator_id_idx").on(table.creatorId),
  };
});

export const insertChallengeSchema = createInsertSchema(challengesTable).omit({
  createdAt: true,
});
export type InsertChallenge = z.infer<typeof insertChallengeSchema>;
export type Challenge = typeof challengesTable.$inferSelect;

export const challengeParticipantsTable = pgTable("challenge_participants", {
  id: text("id").primaryKey(),
  challengeId: text("challenge_id").notNull(),
  userId: text("user_id").notNull(),
  focusMinutes: integer("focus_minutes").notNull().default(0),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
}, (table) => {
  return {
    challengeIdIdx: index("challenge_participants_challenge_id_idx").on(table.challengeId),
    userIdIdx: index("challenge_participants_user_id_idx").on(table.userId),
  };
});

export const insertChallengeParticipantSchema = createInsertSchema(challengeParticipantsTable).omit({
  joinedAt: true,
});
export type InsertChallengeParticipant = z.infer<typeof insertChallengeParticipantSchema>;
export type ChallengeParticipant = typeof challengeParticipantsTable.$inferSelect;

export const storeItemsTable = pgTable("store_items", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  price: integer("price").notNull(),
  icon: text("icon").notNull(),
  rarity: text("rarity").notNull().default("common"),
  colorValue: text("color_value"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertStoreItemSchema = createInsertSchema(storeItemsTable).omit({ createdAt: true });
export type InsertStoreItem = z.infer<typeof insertStoreItemSchema>;
export type StoreItem = typeof storeItemsTable.$inferSelect;

export const userInventoryTable = pgTable("user_inventory", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  itemId: text("item_id").notNull(),
  equipped: boolean("equipped").notNull().default(false),
  purchasedAt: timestamp("purchased_at").notNull().defaultNow(),
}, (table) => {
  return {
    userIdIdx: index("user_inventory_user_id_idx").on(table.userId),
  };
});

export const insertUserInventorySchema = createInsertSchema(userInventoryTable).omit({ purchasedAt: true });
export type InsertUserInventory = z.infer<typeof insertUserInventorySchema>;
export type UserInventory = typeof userInventoryTable.$inferSelect;

export const calendarItemsTable = pgTable("calendar_items", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  subjectId: text("subject_id"),
  title: text("title").notNull(),
  type: text("type").notNull().default("homework"), // exam, homework, other
  dueDate: timestamp("due_date").notNull(),
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    userIdIdx: index("calendar_user_id_idx").on(table.userId),
    subjectIdIdx: index("calendar_subject_id_idx").on(table.subjectId),
    dueDateIdx: index("calendar_due_date_idx").on(table.dueDate),
  };
});

export const insertCalendarItemSchema = createInsertSchema(calendarItemsTable).omit({ createdAt: true });
export type InsertCalendarItem = z.infer<typeof insertCalendarItemSchema>;
export type CalendarItem = typeof calendarItemsTable.$inferSelect;

export const pushTokensTable = pgTable("push_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  token: text("token").notNull(),
  deviceId: text("device_id"),
  platform: text("platform"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastUsed: timestamp("last_used"),
}, (table) => ({
  userIdIdx: index("push_tokens_user_id_idx").on(table.userId),
  userTokenUniq: uniqueIndex("push_tokens_user_token_idx").on(table.userId, table.token),
}));

export const passwordResetTokensTable = pgTable("password_reset_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  tokenHashIdx: index("prt_token_hash_idx").on(table.tokenHash),
  userIdIdx: index("prt_user_id_idx").on(table.userId),
}));

export const emailVerificationTokensTable = pgTable("email_verification_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  tokenHashIdx: index("evt_token_hash_idx").on(table.tokenHash),
  userIdIdx: index("evt_user_id_idx").on(table.userId),
}));

