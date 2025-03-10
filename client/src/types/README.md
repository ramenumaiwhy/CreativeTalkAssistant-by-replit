# 型定義 (Types)

## 概要
このディレクトリには、アプリケーション全体で使用される型定義（データの形や構造を定義したもの）が含まれています。型定義は、データの構造を明確にし、プログラムの安全性を高めるために使用されます。

型定義とは、コンピュータに「このデータはこういう形をしているよ」と教えるためのものです。例えば、「人」というデータには「名前」「年齢」「住所」などの情報があると定義することで、プログラムがそのデータを正しく扱えるようになります。

## ファイル構造
```
types/
└── index.ts       # 主要な型定義
```

## 主要な型定義

### Message（メッセージ）
会話の中の1つのメッセージを表す型です。

```typescript
export interface Message {
  id: string;                           // メッセージの一意のID
  conversationId: string;               // このメッセージが属する会話のID
  role: 'user' | 'assistant' | 'system'; // メッセージの送信者の役割
  content: string;                      // メッセージの内容
  createdAt: string;                    // メッセージが作成された日時
}
```

これは「手紙」のようなもので、誰が（role）、いつ（createdAt）、どんな内容（content）を書いたかが記録されています。また、どの会話（conversationId）に属しているかも分かります。

### Context（コンテキスト）
会話の背景情報を表す型です。

```typescript
export interface Context {
  time: string;        // 会話が行われた時間
  place: string;       // 会話が行われた場所
  mood: string;        // 会話時の気分や雰囲気
  alcoholLevel: string; // アルコールの摂取レベル
}
```

これは「会話の舞台設定」のようなもので、いつ（time）、どこで（place）、どんな雰囲気で（mood）、どれくらいお酒を飲んでいたか（alcoholLevel）という情報が含まれています。

### Conversation（会話）
複数のメッセージからなる1つの会話を表す型です。

```typescript
export interface Conversation {
  id: string;                  // 会話の一意のID
  title: string;               // 会話のタイトル
  messages: Message[];         // 会話に含まれるメッセージの配列
  context?: Context | null;    // 会話の背景情報（オプション）
  keyPoints: string[];         // 会話の要点
  tags?: string[];             // 会話に付けられたタグ（オプション）
  summary?: string;            // 会話の要約（オプション）
  createdAt: string;           // 会話が作成された日時
  updatedAt: string;           // 会話が最後に更新された日時
  lastSaved: string;           // 会話が最後に保存された日時
}
```

これは「1冊の日記」のようなもので、タイトル（title）、いつ書かれたか（createdAt）、内容（messages）、背景（context）、重要なポイント（keyPoints）、分類用のタグ（tags）、全体の要約（summary）などが含まれています。

### ExportData（エクスポートデータ）
会話データをエクスポート（外部に保存）するための型です。

```typescript
export interface ExportData {
  markdown: string;           // マークダウン形式の会話内容
  conversation: Conversation; // 会話データ
}
```

これは「保存用の箱」のようなもので、会話データ（conversation）と、人間が読みやすい形式に整形されたテキスト（markdown）が含まれています。

## 型定義の使用方法

型定義は、コンポーネントやフック、関数などで以下のように使用されます：

```typescript
import { Conversation, Message } from "@/types";

// 会話データを扱う関数
function processConversation(conversation: Conversation) {
  // 会話のタイトルを取得
  const title = conversation.title;
  
  // 会話に含まれるメッセージを処理
  conversation.messages.forEach((message: Message) => {
    // メッセージの内容を処理
    console.log(`${message.role}: ${message.content}`);
  });
  
  // 会話の要点を表示
  conversation.keyPoints.forEach((point: string) => {
    console.log(`- ${point}`);
  });
}
```

## 型定義の利点

1. **コード補完**: エディタが型情報を使って、使用可能なプロパティやメソッドを提案してくれます。
2. **エラー検出**: 間違ったプロパティにアクセスしようとした場合、コンパイル時にエラーが表示されます。
3. **ドキュメント**: 型定義自体がコードの仕様書として機能します。
4. **リファクタリングの安全性**: 型定義を変更すると、それを使用しているすべての場所でエラーが表示されるため、変更漏れを防げます。

## 技術的な背景

### TypeScript

TypeScriptは、JavaScriptに型システムを追加した言語です。型システムにより、コードの品質と保守性が向上します。

### インターフェース (Interface)

インターフェースは、オブジェクトの形状（どのようなプロパティやメソッドを持つか）を定義するための仕組みです。このプロジェクトでは、`interface` キーワードを使用して、データ構造を定義しています。 