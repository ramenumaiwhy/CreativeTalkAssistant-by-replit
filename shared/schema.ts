import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// LINE user table
export const lineUsers = pgTable("line_users", {
  id: serial("id").primaryKey(),
  lineId: text("line_id").notNull().unique(),
  displayName: text("display_name"),
  pictureUrl: text("picture_url"),
  isBlocked: boolean("is_blocked").default(false),
  currentConversationId: text("current_conversation_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertLineUserSchema = createInsertSchema(lineUsers).pick({
  lineId: true,
  displayName: true,
  pictureUrl: true,
});

// Context table
export const contexts = pgTable("contexts", {
  id: serial("id").primaryKey(),
  time: timestamp("time").notNull(),
  place: text("place"),
  mood: text("mood"),
  alcoholLevel: text("alcohol_level"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertContextSchema = createInsertSchema(contexts).pick({
  time: true,
  place: true,
  mood: true,
  alcoholLevel: true,
});

// Conversation table
export const conversations = pgTable("conversations", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  contextId: integer("context_id").references(() => contexts.id),
  keyPoints: text("key_points").array(),
  summary: text("summary"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lastSaved: timestamp("last_saved"),
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  id: true,
  title: true,
  contextId: true,
});

// Message table
export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").references(() => conversations.id),
  role: text("role").notNull(), // 'user', 'assistant', or 'system'
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  id: true,
  conversationId: true,
  role: true,
  content: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertLineUser = z.infer<typeof insertLineUserSchema>;
export type LineUser = typeof lineUsers.$inferSelect;

export type InsertContext = z.infer<typeof insertContextSchema>;
export type Context = typeof contexts.$inferSelect;

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
