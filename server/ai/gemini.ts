import { GoogleGenerativeAI } from "@google/generative-ai";
import { Conversation } from "@/types";

// Initialize Google Generative AI
const apiKey = process.env.GOOGLE_API_KEY || '';
let genAI: GoogleGenerativeAI | null = null;

try {
  genAI = new GoogleGenerativeAI(apiKey);
} catch (error) {
  console.error("Error initializing Google Generative AI:", error);
}

export interface AIResponse {
  message: string;
  title?: string;
  keyPoints?: string[];
  summary?: string;
  tags?: string[];
}

export async function processMessageWithAI(conversation: Conversation, systemPrompt: string): Promise<AIResponse> {
  if (!genAI) {
    throw new Error("Google Generative AI is not initialized. Please provide a valid GOOGLE_API_KEY environment variable.");
  }
  
  try {
    // Get the Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Format conversation history for the chat
    const history = conversation.messages.map(msg => {
      if (msg.role === 'user') {
        return { role: 'user', parts: [{ text: msg.content }] };
      } else if (msg.role === 'assistant') {
        return { role: 'model', parts: [{ text: msg.content }] };
      } else {
        // System messages are handled differently
        return { role: 'user', parts: [{ text: `[SYSTEM]: ${msg.content}` }] };
      }
    });
    
    // Add context information
    const contextInfo = `
      現在の会話コンテキスト:
      - 時間: ${new Date(conversation.context.time).toLocaleString('ja-JP')}
      - 場所: ${conversation.context.place}
      - 気分: ${conversation.context.mood}
      - アルコールレベル: ${conversation.context.alcoholLevel}
    `;
    
    // Add system prompt and context
    const prompt = `
      ${systemPrompt}
      
      ${contextInfo}
      
      以下の対話履歴を元に、ユーザーに対して建設的な対話を続けてください。
      評価懸念のない対話環境での創造性の解放と、アイデアの持続的な発展を促進することが目的です。
      
      また、会話の内容から以下の情報も抽出してください:
      1. 会話の適切なタイトル（最初の応答時のみ）
      2. 主要なキーポイント（箇条書きで5つ程度）
      3. 会話の簡潔な要約（1-2文）
      4. 関連するタグ（3-5つ）
      
      回答は通常の会話文のみとし、上記の抽出情報は別のJSONとして出力してください。
    `;
    
    // Start a chat session
    const chat = model.startChat({
      history,
      systemInstruction: prompt,
    });
    
    // Send the message and get response
    const result = await chat.sendMessage("");
    const response = result.response;
    const responseText = response.text();
    
    // Extract AI message and metadata
    let aiMessage = responseText;
    let title = conversation.title;
    let keyPoints: string[] = [...(conversation.keyPoints || [])];
    let summary = conversation.summary;
    let tags = conversation.tags || [];
    
    // Try to extract JSON metadata if present
    try {
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        const metadata = JSON.parse(jsonMatch[1]);
        
        if (metadata.title && conversation.title === "新しい会話" || conversation.title === "LINE会話") {
          title = metadata.title;
        }
        
        if (metadata.keyPoints && Array.isArray(metadata.keyPoints)) {
          keyPoints = metadata.keyPoints;
        }
        
        if (metadata.summary) {
          summary = metadata.summary;
        }
        
        if (metadata.tags && Array.isArray(metadata.tags)) {
          tags = metadata.tags;
        }
        
        // Remove the JSON block from the message
        aiMessage = responseText.replace(/```json\n[\s\S]*?\n```/g, '').trim();
      }
    } catch (error) {
      console.error("Error parsing JSON metadata:", error);
    }
    
    return {
      message: aiMessage,
      title,
      keyPoints,
      summary,
      tags,
    };
  } catch (error) {
    console.error("Error generating AI response:", error);
    return {
      message: "申し訳ありません、応答の生成中にエラーが発生しました。しばらくしてからもう一度お試しください。",
    };
  }
}
