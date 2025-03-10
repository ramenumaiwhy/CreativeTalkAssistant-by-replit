/**
 * データベーススキーマと型定義
 * 
 * このファイルは、アプリケーションで使用するデータの構造（スキーマ）と型を定義しています。
 * データベーススキーマとは、データベースのテーブル（表）の構造や関係を定義したものです。
 * 型定義とは、プログラム内でデータがどのような形式や制約を持つかを明確にするものです。
 * 
 * これは「設計図」のようなもので、データがどのように保存され、どのような情報を
 * 持つべきかを定義しています。
 */
import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * ユーザーテーブル
 * 
 * テーブルとは、データベース内のデータを格納する表のことです。
 * このテーブルは、アプリケーションのユーザー情報を保存します。
 * 
 * 各フィールド（列）の説明：
 * - id: ユーザーの一意の識別子（自動的に増加する数値）
 * - username: ユーザー名（重複不可）
 * - password: パスワード
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// ユーザー登録時に必要なデータの検証スキーマ
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

/**
 * LINEユーザーテーブル
 * 
 * このテーブルは、LINEを通じてアプリを利用するユーザーの情報を保存します。
 * LINEとは、メッセージングアプリの一種で、このアプリはLINEボットとしても機能します。
 * 
 * 各フィールドの説明：
 * - id: 内部での一意の識別子
 * - lineId: LINE上でのユーザーID
 * - displayName: LINEでの表示名
 * - pictureUrl: プロフィール画像のURL
 * - isBlocked: ユーザーがボットをブロックしているかどうか
 * - currentConversationId: 現在進行中の会話ID
 * - createdAt: レコード作成日時
 * - updatedAt: レコード更新日時
 */
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

// LINEユーザー登録時に必要なデータの検証スキーマ
export const insertLineUserSchema = createInsertSchema(lineUsers).pick({
  lineId: true,
  displayName: true,
  pictureUrl: true,
});

/**
 * コンテキストテーブル
 * 
 * このテーブルは、会話の背景情報（コンテキスト）を保存します。
 * コンテキストとは、会話が行われる状況や環境の情報のことです。
 * 
 * 各フィールドの説明：
 * - id: コンテキストの一意の識別子
 * - time: 会話の時間
 * - place: 会話の場所
 * - mood: ユーザーの気分
 * - alcoholLevel: アルコールレベル
 * - createdAt: レコード作成日時
 * - updatedAt: レコード更新日時
 */
export const contexts = pgTable("contexts", {
  id: serial("id").primaryKey(),
  time: timestamp("time").notNull(),
  place: text("place"),
  mood: text("mood"),
  alcoholLevel: text("alcohol_level"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// コンテキスト作成時に必要なデータの検証スキーマ
export const insertContextSchema = createInsertSchema(contexts).pick({
  time: true,
  place: true,
  mood: true,
  alcoholLevel: true,
});

/**
 * 会話テーブル
 * 
 * このテーブルは、ユーザーとAIの間の会話を保存します。
 * 
 * 各フィールドの説明：
 * - id: 会話の一意の識別子
 * - title: 会話のタイトル
 * - contextId: 関連するコンテキストのID
 * - keyPoints: 会話から抽出された重要なポイント
 * - summary: 会話の要約
 * - tags: 会話に関連するタグ
 * - createdAt: 会話の作成日時
 * - updatedAt: 会話の更新日時
 * - lastSaved: 最後に保存された時間
 */
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

// 会話作成時に必要なデータの検証スキーマ
export const insertConversationSchema = createInsertSchema(conversations).pick({
  id: true,
  title: true,
  contextId: true,
});

/**
 * メッセージテーブル
 * 
 * このテーブルは、会話内の個々のメッセージを保存します。
 * 
 * 各フィールドの説明：
 * - id: メッセージの一意の識別子
 * - conversationId: メッセージが属する会話のID
 * - role: メッセージの送信者の役割（'user'=ユーザー, 'assistant'=AI, 'system'=システム）
 * - content: メッセージの内容
 * - createdAt: メッセージの作成日時
 */
export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").references(() => conversations.id),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// メッセージ作成時に必要なデータの検証スキーマ
export const insertMessageSchema = createInsertSchema(messages).pick({
  id: true,
  conversationId: true,
  role: true,
  content: true,
});

/**
 * 型エクスポート
 * 
 * 以下は、上記で定義したスキーマから型情報を抽出し、
 * アプリケーション全体で使用できるようにエクスポートしています。
 * 
 * 型（Type）とは、データの形や構造を定義したものです。
 * これにより、コード内でデータの形が一貫していることを保証し、
 * エラーを早期に発見できるようになります。
 */

// ユーザー関連の型
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// LINEユーザー関連の型
export type InsertLineUser = z.infer<typeof insertLineUserSchema>;
export type LineUser = typeof lineUsers.$inferSelect;

// コンテキスト関連の型
export type InsertContext = z.infer<typeof insertContextSchema>;
export type Context = typeof contexts.$inferSelect;

// 会話関連の型
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

// メッセージ関連の型
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
