import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { handleLineWebhook } from "./line/handlers";
import { processMessageWithAI } from "./ai/gemini";
import { createSystemPrompt } from "./prd-content";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

// Zod schemas for validation
const contextSchema = z.object({
  time: z.string(),
  place: z.string(),
  mood: z.string(),
  alcoholLevel: z.string(),
});

const messageSchema = z.object({
  content: z.string().min(1, "メッセージ内容は必須です"),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // LINE integration routes
  app.post('/api/webhook', handleLineWebhook);
  
  // Conversations API
  app.get('/api/conversations', async (req: Request, res: Response) => {
    try {
      const conversations = await storage.getConversations();
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ message: "会話リストの取得に失敗しました" });
    }
  });
  
  app.get('/api/conversations/:id', async (req: Request, res: Response) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ message: "会話が見つかりませんでした" });
      }
      res.json(conversation);
    } catch (error) {
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
      
      // Get the conversation
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "会話が見つかりませんでした" });
      }
      
      // Create and add the user message
      const userMessage = {
        id: uuidv4(),
        conversationId,
        role: 'user' as const,
        content,
        createdAt: new Date().toISOString(),
      };
      
      conversation.messages.push(userMessage);
      conversation.updatedAt = new Date().toISOString();
      
      // Update the conversation and get AI response
      await storage.updateConversation(conversation);
      
      // Process with AI and get response
      const systemPrompt = await createSystemPrompt();
      const aiResponse = await processMessageWithAI(conversation, systemPrompt);
      
      // Create the assistant message
      const assistantMessage = {
        id: uuidv4(),
        conversationId,
        role: 'assistant' as const,
        content: aiResponse.message,
        createdAt: new Date().toISOString(),
      };
      
      // Update conversation with AI response and key points
      conversation.messages.push(assistantMessage);
      
      // Update title if it's a new conversation
      if (conversation.title === "新しい会話" && aiResponse.title) {
        conversation.title = aiResponse.title;
      }
      
      // Update key points and summary
      if (aiResponse.keyPoints && aiResponse.keyPoints.length > 0) {
        conversation.keyPoints = aiResponse.keyPoints;
      }
      
      if (aiResponse.summary) {
        conversation.summary = aiResponse.summary;
      }
      
      // Update tags if available
      if (aiResponse.tags && aiResponse.tags.length > 0) {
        conversation.tags = aiResponse.tags;
      }
      
      conversation.updatedAt = new Date().toISOString();
      conversation.lastSaved = new Date().toISOString();
      
      await storage.updateConversation(conversation);
      
      res.json(conversation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "無効なリクエスト", errors: error.errors });
      }
      res.status(500).json({ message: "メッセージの送信に失敗しました" });
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
      markdown += `- 時間: ${new Date(conversation.context.time).toLocaleString('ja-JP')}\n`;
      markdown += `- 場所: ${conversation.context.place}\n`;
      markdown += `- 気分: ${conversation.context.mood}\n`;
      markdown += `- アルコールレベル: ${conversation.context.alcoholLevel}\n\n`;
      
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
  
  return httpServer;
}
