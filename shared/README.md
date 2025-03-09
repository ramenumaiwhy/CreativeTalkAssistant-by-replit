# 共有コード

## 概要
このディレクトリには、クライアント（フロントエンド）とサーバー（バックエンド）の両方で共有されるコードが含まれています。主に型定義やスキーマ定義など、両方の環境で一貫して使用される部分を管理します。

## ファイル構造
```
shared/
└── schema.ts       # データスキーマと型定義
```

## 主要ファイル

### schema.ts
このファイルには、アプリケーション全体で使用されるデータ構造の型定義が含まれています。主な型定義は以下の通りです：

- `Conversation`: 会話データの構造
- `Message`: メッセージの構造
- `Context`: 会話のコンテキスト情報の構造

```typescript
// 会話のコンテキスト情報
export interface Context {
  time: string;      // 会話の時間
  place: string;     // 会話の場所
  mood: string;      // ユーザーの気分
  alcoholLevel: string; // アルコールレベル
}

// メッセージの構造
export interface Message {
  id: string;        // メッセージID
  conversationId: string; // 所属する会話のID
  role: 'user' | 'assistant' | 'system'; // メッセージの送信者
  content: string;   // メッセージの内容
  createdAt: string; // 作成日時
}

// 会話の構造
export interface Conversation {
  id: string;        // 会話ID
  title: string;     // 会話のタイトル
  messages: Message[]; // メッセージの配列
  context: Context;  // コンテキスト情報
  keyPoints?: string[]; // 抽出されたキーポイント
  summary?: string;  // 会話の要約
  tags?: string[];   // 関連するタグ
  createdAt: string; // 作成日時
  updatedAt: string; // 更新日時
  lastSaved: string; // 最終保存日時
}
```

## 使用方法
共有型定義は、クライアントとサーバーの両方から以下のようにインポートして使用します：

```typescript
// クライアント側
import { Conversation, Message } from "@/types";

// サーバー側
import { Conversation, Message } from "../shared/schema";
```

## 型の一貫性
クライアントとサーバー間でデータ構造の一貫性を保つために、このディレクトリの型定義を使用することが重要です。APIリクエストとレスポンスは、これらの型定義に従って構造化されます。

## 拡張方法
新しいデータ構造や型定義が必要な場合は、`schema.ts`ファイルに追加します。既存の型を変更する場合は、クライアントとサーバーの両方に影響することに注意してください。 