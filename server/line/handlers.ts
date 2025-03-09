import type { Request, Response } from "express";
import { WebhookEvent, MessageEvent, TextMessage } from "@line/bot-sdk";
import { lineConfig, getLineClient } from "./client";
import { storage } from "../storage";
import { v4 as uuidv4 } from "uuid";
import { processMessageWithAI } from "../ai/gemini";
import { createSystemPrompt } from "../prd-content";

export async function handleLineWebhook(req: Request, res: Response) {
  // Verify LINE webhook signature
  // This middleware verifies that the request is coming from LINE
  if (!validateLineSignature(req)) {
    return res.status(401).send("Invalid signature");
  }

  try {
    const events: WebhookEvent[] = req.body.events;
    
    // Process each event
    await Promise.all(
      events.map(async (event) => {
        try {
          await processEvent(event);
        } catch (err) {
          console.error(`Error processing event: ${err}`);
        }
      })
    );
    
    res.status(200).end();
  } catch (err) {
    console.error(`Webhook error: ${err}`);
    res.status(500).end();
  }
}

// Process LINE webhook events
async function processEvent(event: WebhookEvent): Promise<void> {
  // Handle message events
  if (event.type === "message" && event.message.type === "text") {
    await handleTextMessage(event);
  }
  
  // Handle follow events (when a user adds the bot as a friend)
  if (event.type === "follow") {
    await handleFollowEvent(event);
  }
  
  // Handle unfollow events (when a user blocks the bot)
  if (event.type === "unfollow") {
    await handleUnfollowEvent(event);
  }
}

// Handle text messages
async function handleTextMessage(event: MessageEvent): Promise<void> {
  if (event.message.type !== "text") return;
  
  const lineId = event.source.userId;
  if (!lineId) return;
  
  try {
    // Get or create LINE user
    let lineUser = await storage.getLineUser(lineId);
    
    if (!lineUser) {
      const client = getLineClient();
      const profile = await client.getProfile(lineId);
      
      lineUser = await storage.createLineUser(lineId, {
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl,
        currentConversationId: null,
      });
    }
    
    // Get or create conversation
    let conversationId = lineUser.currentConversationId;
    let conversation;
    
    if (!conversationId) {
      // Create new conversation
      conversationId = uuidv4();
      
      // Create default context
      const context = {
        time: new Date().toISOString(),
        place: "LINE",
        mood: "未設定",
        alcoholLevel: "なし",
      };
      
      // Create system message
      const systemMessage = {
        id: uuidv4(),
        conversationId,
        role: 'system' as const,
        content: "こんにちは！新しいアイデアについて話し合いましょう。評価や批判を気にせず、自由に発想を広げていきましょう。何か特定のテーマや課題について考えたいことはありますか？",
        createdAt: new Date().toISOString(),
      };
      
      // Create conversation
      conversation = await storage.createConversation({
        id: conversationId,
        title: "LINE会話",
        messages: [systemMessage],
        context,
        keyPoints: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastSaved: new Date().toISOString(),
      });
      
      // Update LINE user with conversation ID
      await storage.updateLineUser(lineId, {
        currentConversationId: conversationId,
      });
    } else {
      // Get existing conversation
      conversation = await storage.getConversation(conversationId);
      
      if (!conversation) {
        // Create new conversation if the existing one was not found
        conversationId = uuidv4();
        
        const context = {
          time: new Date().toISOString(),
          place: "LINE",
          mood: "未設定",
          alcoholLevel: "なし",
        };
        
        const systemMessage = {
          id: uuidv4(),
          conversationId,
          role: 'system' as const,
          content: "こんにちは！新しいアイデアについて話し合いましょう。評価や批判を気にせず、自由に発想を広げていきましょう。何か特定のテーマや課題について考えたいことはありますか？",
          createdAt: new Date().toISOString(),
        };
        
        conversation = await storage.createConversation({
          id: conversationId,
          title: "LINE会話",
          messages: [systemMessage],
          context,
          keyPoints: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastSaved: new Date().toISOString(),
        });
        
        await storage.updateLineUser(lineId, {
          currentConversationId: conversationId,
        });
      }
    }
    
    // Add user message to conversation
    const userMessage = {
      id: uuidv4(),
      conversationId,
      role: 'user' as const,
      content: event.message.text,
      createdAt: new Date().toISOString(),
    };
    
    conversation.messages.push(userMessage);
    conversation.updatedAt = new Date().toISOString();
    
    await storage.updateConversation(conversation);
    
    // Process with AI
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
    if (conversation.title === "LINE会話" && aiResponse.title) {
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
    
    // Reply to the user
    const client = getLineClient();
    await client.replyMessage(event.replyToken, {
      type: "text",
      text: aiResponse.message,
    });
    
  } catch (error) {
    console.error("Error handling text message:", error);
    
    // Send error message to user
    try {
      const client = getLineClient();
      await client.replyMessage(event.replyToken, {
        type: "text",
        text: "申し訳ありません、メッセージの処理中にエラーが発生しました。しばらくしてからもう一度お試しください。",
      });
    } catch (replyError) {
      console.error("Error sending error reply:", replyError);
    }
  }
}

// Handle follow events
async function handleFollowEvent(event: WebhookEvent): Promise<void> {
  if (event.type !== "follow") return;
  
  const lineId = event.source.userId;
  if (!lineId) return;
  
  try {
    const client = getLineClient();
    const profile = await client.getProfile(lineId);
    
    // Create or update user in storage
    let lineUser = await storage.getLineUser(lineId);
    
    if (lineUser) {
      // Update existing user
      await storage.updateLineUser(lineId, {
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl,
        isBlocked: false,
      });
    } else {
      // Create new user
      await storage.createLineUser(lineId, {
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl,
        isBlocked: false,
        currentConversationId: null,
      });
    }
    
    // Send welcome message
    await client.pushMessage(lineId, {
      type: "text",
      text: "ConstructiveTalkへようこそ！評価や批判を気にせず、自由な発想で会話しましょう。何か話し合いたいアイデアやトピックはありますか？",
    });
    
  } catch (error) {
    console.error("Error handling follow event:", error);
  }
}

// Handle unfollow events
async function handleUnfollowEvent(event: WebhookEvent): Promise<void> {
  if (event.type !== "unfollow") return;
  
  const lineId = event.source.userId;
  if (!lineId) return;
  
  try {
    // Mark user as blocked
    let lineUser = await storage.getLineUser(lineId);
    
    if (lineUser) {
      await storage.updateLineUser(lineId, {
        isBlocked: true,
      });
    }
  } catch (error) {
    console.error("Error handling unfollow event:", error);
  }
}

// Validate LINE webhook signature
function validateLineSignature(req: Request): boolean {
  // Skip signature validation in development environment
  if (process.env.NODE_ENV === "development" && process.env.SKIP_LINE_SIGNATURE_VALIDATION === "true") {
    return true;
  }
  
  // Require line-bot-sdk for signature validation
  try {
    const crypto = require("crypto");
    const signature = req.headers["x-line-signature"] as string;
    
    if (!signature) return false;
    
    const channelSecret = lineConfig.channelSecret;
    const body = JSON.stringify(req.body);
    
    const hash = crypto
      .createHmac("SHA256", channelSecret)
      .update(body)
      .digest("base64");
    
    return hash === signature;
  } catch (err) {
    console.error("Error validating signature:", err);
    return false;
  }
}
