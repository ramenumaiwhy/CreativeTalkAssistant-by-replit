/**
 * APIルート定義ファイル
 * 
 * このファイルは、アプリケーションのAPIエンドポイント（外部からアクセスできる機能の入口）を定義しています。
 * APIエンドポイントとは、クライアント（ブラウザやスマホアプリ）がサーバーと通信するための特定のURLパスです。
 * これは「お店の中の専用カウンター」のようなもので、それぞれ異なる機能（商品注文、返品、問い合わせなど）を提供します。
 */
import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { handleLineWebhook } from "./line/handlers";
import { processMessageWithAI } from "./ai/gemini";
import { createSystemPrompt } from "./prd-content";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

/**
 * WebSocket接続を保持するためのマップ
 * 
 * WebSocketとは、クライアントとサーバー間でリアルタイム通信を行うための技術です。
 * 通常のHTTP通信は「リクエスト→レスポンス」の一方通行ですが、WebSocketは双方向の
 * 継続的な通信が可能です。これは「常時接続された専用電話回線」のようなものです。
 * 
 * このマップは、各会話IDに対して、その会話を監視しているクライアント接続を管理します。
 * キー: 会話ID, 値: その会話を購読している接続のセット
 */
const subscriptions = new Map<string, Set<WebSocket>>();

/**
 * 指定した会話IDに対する更新を購読者に通知する関数
 * 
 * この関数は、会話が更新されたときに、その会話を監視しているすべてのクライアントに
 * 更新内容をリアルタイムで通知します。これにより、複数のユーザーが同じ会話を
 * 見ている場合でも、全員のブラウザに最新の状態が表示されます。
 * 
 * @param conversationId - 更新された会話のID
 * @param data - 送信するデータ
 */
function notifySubscribers(conversationId: string, data: any) {
  // 指定された会話IDを監視しているクライアント接続のセットを取得
  const subscribers = subscriptions.get(conversationId);
  if (!subscribers) {
    console.log(`WebSocket: No subscribers found for conversation: ${conversationId}`);
    return;  // 監視しているクライアントがなければ何もしない
  }

  // 送信するメッセージをJSON形式に変換
  // JSON（JavaScript Object Notation）とは、データを構造化して表現するためのテキスト形式です
  const message = JSON.stringify({
    type: 'update',
    conversationId,
    data
  });

  console.log(`WebSocket: Notifying ${subscribers.size} subscribers for conversation: ${conversationId}, data type: ${data.type}`);
  
  // 各クライアント接続にメッセージを送信
  let sentCount = 0;
  subscribers.forEach(client => {
    // クライアントが接続中（OPEN状態）の場合のみ送信
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      sentCount++;
    }
  });
  
  console.log(`WebSocket: Message sent to ${sentCount}/${subscribers.size} clients`);
}

/**
 * バリデーションスキーマ
 * 
 * Zodは、データの検証（バリデーション）を行うためのライブラリです。
 * スキーマとは、データの構造や型、制約を定義したものです。
 * これは「入力フォームのチェックリスト」のようなもので、
 * 受け取ったデータが正しい形式かどうかを確認します。
 */

// コンテキスト情報のバリデーションスキーマ
const contextSchema = z.object({
  time: z.string(),  // 時間（文字列形式）
  place: z.string(), // 場所
  mood: z.string(),  // 気分
  alcoholLevel: z.string(), // アルコールレベル
});

// メッセージのバリデーションスキーマ
const messageSchema = z.object({
  // content: 最低1文字以上のメッセージ内容（空メッセージは不可）
  content: z.string().min(1, "メッセージ内容は必須です"),
});

/**
 * APIルートを登録する関数
 * 
 * この関数は、Expressアプリケーションに各種APIエンドポイントを登録します。
 * Expressとは、Node.jsでWebアプリケーションを作るためのフレームワーク（枠組み）です。
 * 
 * @param app - Expressアプリケーションインスタンス
 * @returns HTTPサーバーインスタンス
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // LINE連携用のWebhookエンドポイント
  // Webhookとは、外部サービスからの通知を受け取るためのURLです
  app.post('/api/webhook', handleLineWebhook);

  /**
   * 会話一覧を取得するAPI
   * 
   * HTTPメソッド: GET
   * パス: /api/conversations
   * 
   * このAPIは、保存されているすべての会話のリストを返します。
   * GETは「データの取得」を意味するHTTPメソッドです。
   */
  app.get('/api/conversations', async (req: Request, res: Response) => {
    try {
      // ストレージから会話一覧を取得
      const conversations = await storage.getConversations();
      // JSON形式でクライアントに返す
      res.json(conversations);
    } catch (error) {
      // エラーが発生した場合は500エラー（サーバーエラー）を返す
      res.status(500).json({ message: "会話リストの取得に失敗しました" });
    }
  });

  /**
   * 特定の会話を取得するAPI
   * 
   * HTTPメソッド: GET
   * パス: /api/conversations/:id
   * パラメータ: id - 取得する会話のID
   * 
   * このAPIは、指定されたIDの会話の詳細情報を返します。
   * URLの:idの部分は、実際のリクエスト時に具体的な会話IDに置き換えられます。
   */
  app.get('/api/conversations/:id', async (req: Request, res: Response) => {
    try {
      // パスパラメータから会話IDを取得し、ストレージから該当する会話を検索
      const conversation = await storage.getConversation(req.params.id);
      // 会話が見つからない場合は404エラー（Not Found）を返す
      if (!conversation) {
        return res.status(404).json({ message: "会話が見つかりませんでした" });
      }
      // 会話データをJSON形式でクライアントに返す
      res.json(conversation);
    } catch (error) {
      // エラーが発生した場合は500エラー（サーバーエラー）を返す
      res.status(500).json({ message: "会話の取得に失敗しました" });
    }
  });

  app.post('/api/conversations', async (req: Request, res: Response) => {
    try {
      const context = contextSchema.parse(req.body.context);

      // Create a new conversation with a system message
      const conversationId = uuidv4();
      const systemMessage = {
        id: uuidv4(),
        conversationId,
        role: 'system' as const,
        content: "こんにちは！新しいアイデアについて話し合いましょう。評価や批判を気にせず、自由に発想を広げていきましょう。何か特定のテーマや課題について考えたいことはありますか？",
        createdAt: new Date().toISOString(),
      };

      const conversation = await storage.createConversation({
        id: conversationId,
        title: "新しい会話",
        messages: [systemMessage],
        context,
        keyPoints: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastSaved: new Date().toISOString(),
      });

      res.status(201).json(conversation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "無効なリクエスト", errors: error.errors });
      }
      res.status(500).json({ message: "会話の作成に失敗しました" });
    }
  });

  app.post('/api/conversations/:id/messages', async (req: Request, res: Response) => {
    try {
      const { content } = messageSchema.parse(req.body);
      const conversationId = req.params.id;

      console.log(`Received message for conversation ${conversationId}: ${content.substring(0, 20)}...`);

      // Get the conversation
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        console.error(`Conversation not found: ${conversationId}`);
        return res.status(404).json({ message: "会話が見つかりませんでした" });
      }

      console.log(`Found conversation: ${conversation.id}, messages count: ${conversation.messages.length}`);

      // Create and add the user message
      const userMessage = {
        id: uuidv4(),
        conversationId,
        role: 'user' as const,
        content,
        createdAt: new Date().toISOString(),
      };

      // 会話に新しいメッセージを追加
      conversation.messages.push(userMessage);
      conversation.updatedAt = new Date().toISOString();

      // 会話を保存
      console.log(`Saving user message to conversation ${conversationId}`);
      await storage.updateConversation(conversation);

      // WebSocketを通じてユーザーメッセージを即時通知
      notifySubscribers(conversationId, {
        type: 'new_message',
        message: userMessage,
        status: 'user_message_sent'
      });

      // AIによる処理を実行
      console.log(`Processing conversation with AI: ${conversationId}`);
      const systemPrompt = await createSystemPrompt();
      const aiResponse = await processMessageWithAI(conversation, systemPrompt);

      // AIの応答メッセージを作成
      const assistantMessage = {
        id: uuidv4(),
        conversationId,
        role: 'assistant' as const,
        content: aiResponse.message,
        createdAt: new Date().toISOString(),
      };

      // AIの応答を会話に追加
      console.log(`Adding AI response to conversation ${conversationId}`);
      conversation.messages.push(assistantMessage);

      // タイトルが新しい会話の場合は、AIが提案したタイトルに更新
      if (conversation.title === "新しい会話" && aiResponse.title) {
        console.log(`Updating conversation title to: ${aiResponse.title}`);
        conversation.title = aiResponse.title;
      }

      // キーポイントとサマリーを更新
      if (aiResponse.keyPoints && aiResponse.keyPoints.length > 0) {
        conversation.keyPoints = aiResponse.keyPoints;
      }

      if (aiResponse.summary) {
        conversation.summary = aiResponse.summary;
      }

      // タグを更新
      if (aiResponse.tags && aiResponse.tags.length > 0) {
        conversation.tags = aiResponse.tags;
      }

      // 更新日時を設定
      conversation.updatedAt = new Date().toISOString();
      conversation.lastSaved = new Date().toISOString();

      // 会話を保存
      console.log(`Saving updated conversation: ${conversationId}, total messages: ${conversation.messages.length}`);
      await storage.updateConversation(conversation);

      // AIの応答をWebSocket経由で通知
      notifySubscribers(conversationId, {
        type: 'new_message',
        message: assistantMessage,
        status: 'ai_response_complete',
        metadata: {
          title: aiResponse.title,
          keyPoints: aiResponse.keyPoints,
          summary: aiResponse.summary,
          tags: aiResponse.tags
        }
      });

      // 更新された会話を返す
      res.json(conversation);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "無効なリクエスト", errors: error.errors });
      }

      // Gemini APIのエラーをより詳細に処理
      if (error.name === 'GoogleGenerativeAIFetchError') {
        console.error('AI Error:', error);

        // APIキーが無効な場合
        if (error.status === 400 && error.message.includes('API key not valid')) {
          return res.status(503).json({
            message: "AIサービスが一時的に利用できません",
            detail: "API認証に問題が発生しました。しばらく経ってから再度お試しください。"
          });
        }

        // レート制限に達した場合
        if (error.status === 429) {
          return res.status(503).json({
            message: "AIサービスが一時的に混雑しています",
            detail: "しばらく時間をおいてから再度お試しください。"
          });
        }

        // その他のAIサービスエラー
        return res.status(503).json({
          message: "AIサービスとの通信に失敗しました",
          detail: "しばらく経ってから再度お試しください。"
        });
      }

      // その他の予期しないエラー
      console.error('Unexpected error:', error);
      res.status(500).json({
        message: "メッセージの送信に失敗しました",
        detail: "予期しないエラーが発生しました。しばらく経ってから再度お試しください。"
      });
    }
  });

  app.patch('/api/conversations/:id/context', async (req: Request, res: Response) => {
    try {
      const context = contextSchema.parse(req.body);
      const conversationId = req.params.id;

      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "会話が見つかりませんでした" });
      }

      conversation.context = context;
      conversation.updatedAt = new Date().toISOString();

      await storage.updateConversation(conversation);

      // コンテキスト更新をWebSocket経由で通知
      notifySubscribers(conversationId, {
        type: 'context_updated',
        context: context
      });

      res.json(conversation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "無効なリクエスト", errors: error.errors });
      }
      res.status(500).json({ message: "コンテキストの更新に失敗しました" });
    }
  });

  app.get('/api/conversations/:id/export', async (req: Request, res: Response) => {
    try {
      const conversationId = req.params.id;

      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "会話が見つかりませんでした" });
      }

      // Generate markdown representation
      let markdown = `# ${conversation.title}\n\n`;

      // Add context information
      markdown += `## コンテキスト情報\n\n`;
      if (conversation.context) {
        markdown += `- 時間: ${new Date(conversation.context.time || new Date()).toLocaleString('ja-JP')}\n`;
        markdown += `- 場所: ${conversation.context.place || '未設定'}\n`;
        markdown += `- 気分: ${conversation.context.mood || '未設定'}\n`;
        markdown += `- アルコールレベル: ${conversation.context.alcoholLevel || 'なし'}\n\n`;
      } else {
        markdown += `- 時間: ${new Date().toLocaleString('ja-JP')}\n`;
        markdown += `- 場所: 未設定\n`;
        markdown += `- 気分: 未設定\n`;
        markdown += `- アルコールレベル: なし\n\n`;
      }

      // Add messages
      markdown += `## 会話内容\n\n`;
      for (const message of conversation.messages) {
        if (message.role === 'system') {
          markdown += `**システム**: ${message.content}\n\n`;
        } else if (message.role === 'user') {
          markdown += `**あなた**: ${message.content}\n\n`;
        } else {
          markdown += `**AI**: ${message.content}\n\n`;
        }
      }

      // Add key points
      if (conversation.keyPoints && conversation.keyPoints.length > 0) {
        markdown += `## キーポイント\n\n`;
        for (const point of conversation.keyPoints) {
          markdown += `- ${point}\n`;
        }
        markdown += '\n';
      }

      // Add summary if available
      if (conversation.summary) {
        markdown += `## 要約\n\n${conversation.summary}\n\n`;
      }

      // Add tags if available
      if (conversation.tags && conversation.tags.length > 0) {
        markdown += `## タグ\n\n`;
        markdown += conversation.tags.map(tag => `#${tag}`).join(' ') + '\n\n';
      }

      res.json({ markdown, conversation });
    } catch (error) {
      res.status(500).json({ message: "エクスポートに失敗しました" });
    }
  });

  const httpServer = createServer(app);

  // WebSocketサーバーの初期化
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // 接続数をカウントして表示するための変数
  let connectionCount = 0;
  
  wss.on('connection', (ws, req) => {
    connectionCount++;
    const clientIP = req.socket.remoteAddress || 'unknown';
    console.log(`WebSocket client connected (total: ${connectionCount}, IP: ${clientIP})`);

    // 接続ごとに購読中の会話IDを保持
    let subscribedConversationId: string | null = null;

    // クライアントからのメッセージを処理
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log(`WebSocket received message: ${message.toString().substring(0, 100)}...`);

        if (data.type === 'subscribe' && data.conversationId) {
          // 以前の購読があれば解除
          if (subscribedConversationId) {
            const oldSubscribers = subscriptions.get(subscribedConversationId);
            if (oldSubscribers) {
              oldSubscribers.delete(ws);
              if (oldSubscribers.size === 0) {
                subscriptions.delete(subscribedConversationId);
              }
            }
          }

          // 新しい会話を購読
          const newConversationId = data.conversationId as string;
          subscribedConversationId = newConversationId;
          let subscribers = subscriptions.get(newConversationId);

          if (!subscribers) {
            subscribers = new Set();
            subscriptions.set(newConversationId, subscribers);
          }

          subscribers.add(ws);
          console.log(`Client subscribed to conversation: ${subscribedConversationId}`);

          // 購読成功を通知
          ws.send(JSON.stringify({
            type: 'subscribed',
            conversationId: subscribedConversationId
          }));
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    // 接続が閉じられたときの処理
    ws.on('close', (code, reason) => {
      connectionCount--;
      console.log(`WebSocket client disconnected (remaining: ${connectionCount}, code: ${code}, reason: ${reason || 'なし'})`);

      // 購読を解除
      if (subscribedConversationId) {
        const subscribers = subscriptions.get(subscribedConversationId);
        if (subscribers) {
          subscribers.delete(ws);
          console.log(`Unsubscribed client from conversation: ${subscribedConversationId}, remaining subscribers: ${subscribers.size}`);
          if (subscribers.size === 0) {
            subscriptions.delete(subscribedConversationId);
            console.log(`Removed conversation ${subscribedConversationId} from subscriptions, total conversations: ${subscriptions.size}`);
          }
        }
      }
      
      // 現在の購読状態をログに表示
      console.log(`Current subscription state: ${subscriptions.size} conversations being subscribed`);
    });
  });

  return httpServer;
}
