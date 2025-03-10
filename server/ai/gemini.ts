import { GoogleGenerativeAI } from "@google/generative-ai";
import { Conversation } from "@/types";

/**
 * Google Generative AI（Gemini）の初期化
 * 
 * ここでは、Google提供のAIサービス「Gemini」を使うための準備をしています。
 * APIキーは環境変数から取得します。APIキーとは、外部サービスを利用するための
 * 「鍵」のようなもので、これがないとサービスを使うことができません。
 */
// APIキーを環境変数から取得（Vercel対応）
let apiKey = process.env.GOOGLE_API_KEY || '';

// APIキーが"GOOGLE_API_KEY="または"GOOGLE_GENERATIVE_AI_API_KEY="の形式で設定されている場合の補正処理
if (apiKey.includes('GOOGLE_API_KEY=')) {
  apiKey = apiKey.split('=')[1];
  console.log("Extracted API key from GOOGLE_API_KEY format");
} else if (apiKey.includes('GOOGLE_GENERATIVE_AI_API_KEY=')) {
  apiKey = apiKey.split('=')[1];
  console.log("Extracted API key from GOOGLE_GENERATIVE_AI_API_KEY format");
}

// APIキーの先頭が「AIza」で始まるかチェック（一般的なGoogle APIキーの形式）
// APIキーがVercelのシークレット環境変数で暗号化されている場合は警告を表示しない
if (!apiKey.startsWith('AIza')) {
  console.warn("WARNING: API Key may be invalid - does not start with 'AIza'");
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    console.log("Running in production environment, API key validation skipped");
  }
} else {
  console.log("API Key format verified:", apiKey.substring(0, 5) + "****");
}
let genAI: GoogleGenerativeAI | null = null;

try {
  // Google Generative AIを初期化
  genAI = new GoogleGenerativeAI(apiKey);
} catch (error) {
  // 初期化に失敗した場合はエラーをログに出力
  console.error("Error initializing Google Generative AI:", error);
}

/**
 * テスト用のモックレスポンスを生成するフラグ
 * 本番環境では必ずfalseに設定
 * MCPモードはModel, Content, Promptの頭文字でGemini APIに依存せずテストできるモード
 */
const USE_MCP_MODE = process.env.USE_MCP_MODE === 'true' || false;

/**
 * AIからの応答の形式を定義するインターフェース
 * 
 * このインターフェースは、AIからの応答がどのような形式で返ってくるかを定義しています。
 * 
 * @property message - AIからのメッセージ本文
 * @property title - 会話のタイトル（オプション）
 * @property keyPoints - 会話から抽出されたキーポイント（オプション）
 * @property summary - 会話の要約（オプション）
 * @property tags - 会話に関連するタグ（オプション）
 */
export interface AIResponse {
  message: string;
  title?: string;
  keyPoints?: string[];
  summary?: string;
  tags?: string[];
}

/**
 * AIを使ってメッセージを処理する関数
 * 
 * この関数は、ユーザーとの会話をAIに送信し、AIからの応答を取得します。
 * また、会話のタイトル、キーポイント、要約、タグなどのメタデータも抽出します。
 * 
 * @param conversation - 処理する会話データ
 * @param systemPrompt - AIに与えるシステム指示（AIの振る舞いを決める指示文）
 * @returns AIからの応答とメタデータ
 */
export async function processMessageWithAI(conversation: Conversation, systemPrompt: string): Promise<AIResponse> {
  // AIが初期化されていない場合はエラーを投げる
  if (!genAI) {
    throw new Error("Google Generative AI is not initialized. Please provide a valid GOOGLE_API_KEY environment variable.");
  }

  try {
    // Geminiモデルを取得
    // （「モデル」とは、AIの種類や能力を決める設定のことです）
    // 注意: モデル名はAPIバージョンによって異なる場合があります
    // APIの最新バージョンに対応するモデル名を使用
    // Google APIのドキュメントによれば、一般的に利用可能なモデル名は以下：
    // - gemini-pro
    // - gemini-pro-vision
    // - gemini-ultra
    // - gemini-1.5-pro-latest
    // - gemini-1.5-flash-latest
    // @google/generative-aiライブラリのバージョンによって正しいモデル名が異なる場合があります
    // APIバージョンによって利用可能なモデル名が変わります
    // 一般的なモデル名: gemini-pro, gemini-1.5-pro, gemini-1.0-pro など
    // エラーが出る場合は、Google AI Studioで最新のモデル名を確認してください
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro-latest" // 最新のモデル名を使用
    });

    // 会話履歴をAIが理解できる形式に変換
    // （会話の各メッセージを「誰が話したか」と「何を言ったか」の形式に整理します）
    console.log(`Converting ${conversation.messages.length} messages to AI format`);
    
    const history = conversation.messages.map(msg => {
      if (msg.role === 'user') {
        // ユーザーのメッセージ
        console.log(`User message: ${msg.content.substring(0, 30)}...`);
        return { role: 'user', parts: [{ text: msg.content }] };
      } else if (msg.role === 'assistant') {
        // AIのメッセージ
        console.log(`Assistant message: ${msg.content.substring(0, 30)}...`);
        return { role: 'model', parts: [{ text: msg.content }] };
      } else {
        // システムメッセージ（AIへの指示など）
        console.log(`System message: ${msg.content.substring(0, 30)}...`);
        return { role: 'user', parts: [{ text: `[SYSTEM]: ${msg.content}` }] };
      }
    });
    
    console.log(`Converted ${history.length} messages for AI processing`);

    // コンテキスト情報（時間、場所、気分、アルコールレベル）を文字列に整形
    // （「コンテキスト」とは、会話の背景情報のことです）
    let contextInfo = '';
    
    if (conversation.context) {
      contextInfo = `
        現在の会話コンテキスト:
        - 時間: ${new Date(conversation.context.time || new Date()).toLocaleString('ja-JP')}
        - 場所: ${conversation.context.place || '未設定'}
        - 気分: ${conversation.context.mood || '未設定'}
        - アルコールレベル: ${conversation.context.alcoholLevel || 'なし'}
      `;
    } else {
      contextInfo = `
        現在の会話コンテキスト:
        - 時間: ${new Date().toLocaleString('ja-JP')}
        - 場所: 未設定
        - 気分: 未設定
        - アルコールレベル: なし
      `;
    }

    // システムプロンプトとコンテキスト情報を組み合わせて、AIへの指示を作成
    // （「プロンプト」とは、AIに与える指示や質問のことです）
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

    // チャットセッションを開始
    // （AIとの会話を始めるための準備をします）
    // 履歴があり、最大メッセージ数に達していない場合のみチャットモードを使用
    // メッセージが多すぎるとエラーが発生するため、制限を設ける
    const maxMessagesForChat = 10;
    let result;
    
    try {
      if (history.length > 0 && history.length <= maxMessagesForChat) {
        // チャット履歴でセッションを開始
        console.log(`Using chat mode with ${history.length} messages (max: ${maxMessagesForChat})`);
        
        // ヒストリー形式最適化: 最大メッセージ数を考慮しつつ、会話の流れを維持
        let optimizedHistory = [...history];
        if (history.length > 5) {
          // メッセージが多い場合は最初のシステムメッセージと最近のメッセージのみを保持
          const systemMessages = history.filter(msg => msg.parts[0].text.startsWith('[SYSTEM]'));
          const recentMessages = history.slice(-5); // 最新の5メッセージ
          
          // システムメッセージとユーザーメッセージの組み合わせを最適化
          if (systemMessages.length > 0) {
            optimizedHistory = [...systemMessages, ...recentMessages.filter(msg => !msg.parts[0].text.startsWith('[SYSTEM]'))];
            console.log(`Optimized history: ${optimizedHistory.length} messages (${systemMessages.length} system + ${optimizedHistory.length - systemMessages.length} recent)`);
          } else {
            optimizedHistory = recentMessages;
            console.log(`Optimized history: ${optimizedHistory.length} recent messages`);
          }
        }
        
        // チャットセッション開始
        const chat = model.startChat({
          history: optimizedHistory,
          systemInstruction: prompt,
        });
        
        // 最新のユーザーメッセージを見つける
        const lastUserMsgs = conversation.messages
          .filter(msg => msg.role === 'user')
          .slice(-2); // 最新の2つ
        
        console.log(`Last user messages (${lastUserMsgs.length}):`);
        lastUserMsgs.forEach((msg, i) => {
          console.log(`  ${i+1}: ${msg.content.substring(0, 40)}...`);
        });
        
        // 最後のユーザーメッセージまたは空メッセージを使用
        const lastUserMsg = lastUserMsgs.length > 0 ? lastUserMsgs[lastUserMsgs.length - 1].content : "";
        console.log(`Sending to AI: ${lastUserMsg.substring(0, 40)}${lastUserMsg.length > 40 ? '...' : ''}`);
        
        result = await chat.sendMessage(lastUserMsg || "");
        console.log(`Received response from AI`);
      } else {
        // 履歴が長すぎる場合や履歴がない場合は最適化されたリクエストとして送信
        console.log(`Using optimized prompt mode: message count (${history.length}) exceeds limit or is empty`);
        
        // システムプロンプトと重要なメッセージの組み合わせを作成
        const userMessages = conversation.messages.filter(msg => msg.role === 'user');
        const assistantMessages = conversation.messages.filter(msg => msg.role === 'assistant');
        console.log(`Found ${userMessages.length} user messages and ${assistantMessages.length} assistant messages`);
        
        // 最後のユーザーメッセージを取得
        const lastUserMsg = userMessages.length > 0 ? 
          userMessages[userMessages.length - 1] : 
          { content: "こんにちは" };
        
        // 直近の会話コンテキストを構築（最大3往復まで）
        let conversationContext = "";
        const maxTurns = Math.min(3, Math.min(userMessages.length, assistantMessages.length));
        
        if (maxTurns > 0) {
          conversationContext = "\n\n# 直近の会話\n";
          
          for (let i = 1; i <= maxTurns; i++) {
            const userIdx = userMessages.length - i;
            const assistantIdx = assistantMessages.length - i;
            
            if (userIdx >= 0 && assistantIdx >= 0) {
              conversationContext += `\nユーザー: ${userMessages[userIdx].content.substring(0, 100)}${userMessages[userIdx].content.length > 100 ? '...' : ''}\n`;
              conversationContext += `アシスタント: ${assistantMessages[assistantIdx].content.substring(0, 100)}${assistantMessages[assistantIdx].content.length > 100 ? '...' : ''}\n`;
            }
          }
        }
        
        console.log(`Using last user message: ${lastUserMsg.content.substring(0, 40)}...`);
        
        const fullPrompt = `${prompt}${conversationContext}\n\n# 最新のユーザーメッセージ\n${lastUserMsg.content}`;
        console.log(`Sending optimized prompt request with context summary`);
        result = await model.generateContent(fullPrompt);
        console.log(`Received response from AI`);
      }
    } catch (promptError) {
      console.error("Chat session error, falling back to single prompt:", promptError);
      
      // エラー発生時は単一プロンプトモードにフォールバック
      const userMessages = conversation.messages.filter(msg => msg.role === 'user');
      
      // 最後のユーザーメッセージを取得
      const lastUserMsg = userMessages.length > 0 ? 
        userMessages[userMessages.length - 1] : 
        { content: "こんにちは" };
      
      console.log(`[FALLBACK] Using last user message: ${lastUserMsg.content.substring(0, 40)}...`);
      
      const fullPrompt = `${prompt}\n\n以下は最新のユーザーメッセージです:\n${lastUserMsg.content}`;
      console.log(`[FALLBACK] Sending single prompt request`);
      result = await model.generateContent(fullPrompt);
      console.log(`[FALLBACK] Received response from AI`);
    }
    const response = result.response;
    const responseText = response.text();

    // AIの応答とメタデータを初期化
    let aiMessage = responseText;
    let title = conversation.title;
    let keyPoints: string[] = [...(conversation.keyPoints || [])];
    let summary = conversation.summary;
    let tags = conversation.tags || [];

    // AIの応答からJSONメタデータを抽出（もし含まれていれば）
    // （AIは通常の返答と一緒に、タイトルやキーポイントなどの情報をJSON形式で返します）
    try {
      // JSONブロックを正規表現で検索
      // （```json と ``` で囲まれた部分を探します）
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        // JSONをパース（解析）
        const metadata = JSON.parse(jsonMatch[1]);

        // タイトルの更新（新しい会話またはLINE会話の場合のみ）
        if (metadata.title && conversation.title === "新しい会話" || conversation.title === "LINE会話") {
          title = metadata.title;
        }

        // キーポイントの更新
        if (metadata.keyPoints && Array.isArray(metadata.keyPoints)) {
          keyPoints = metadata.keyPoints;
        }

        // 要約の更新
        if (metadata.summary) {
          summary = metadata.summary;
        }

        // タグの更新
        if (metadata.tags && Array.isArray(metadata.tags)) {
          tags = metadata.tags;
        }

        // JSONブロックをメッセージから削除
        // （ユーザーには通常の会話文だけを表示するため）
        aiMessage = responseText.replace(/```json\n[\s\S]*?\n```/g, '').trim();
      }
    } catch (error) {
      // JSONのパースに失敗した場合はエラーをログに出力
      console.error("Error parsing JSON metadata:", error);
    }

    // AIの応答とメタデータを返す
    return {
      message: aiMessage,
      title,
      keyPoints,
      summary,
      tags,
    };
  } catch (error) {
    // AIとの通信に失敗した場合はエラーをログに出力し、エラーメッセージを返す
    console.error("Error generating AI response:", error);
    return {
      message: "申し訳ありません、応答の生成中にエラーが発生しました。しばらくしてからもう一度お試しください。",
    };
  }
}
