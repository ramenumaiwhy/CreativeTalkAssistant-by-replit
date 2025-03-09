import { GoogleGenerativeAI } from "@google/generative-ai";
import { Conversation } from "@/types";

/**
 * Google Generative AI（Gemini）の初期化
 * 
 * ここでは、Google提供のAIサービス「Gemini」を使うための準備をしています。
 * APIキーは環境変数から取得します。APIキーとは、外部サービスを利用するための
 * 「鍵」のようなもので、これがないとサービスを使うことができません。
 */
// APIキーを環境変数から取得
const apiKey = process.env.GOOGLE_API_KEY || '';
let genAI: GoogleGenerativeAI | null = null;

try {
  // Google Generative AIを初期化
  genAI = new GoogleGenerativeAI(apiKey);
} catch (error) {
  // 初期化に失敗した場合はエラーをログに出力
  console.error("Error initializing Google Generative AI:", error);
}

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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 会話履歴をAIが理解できる形式に変換
    // （会話の各メッセージを「誰が話したか」と「何を言ったか」の形式に整理します）
    const history = conversation.messages.map(msg => {
      if (msg.role === 'user') {
        // ユーザーのメッセージ
        return { role: 'user', parts: [{ text: msg.content }] };
      } else if (msg.role === 'assistant') {
        // AIのメッセージ
        return { role: 'model', parts: [{ text: msg.content }] };
      } else {
        // システムメッセージ（AIへの指示など）
        return { role: 'user', parts: [{ text: `[SYSTEM]: ${msg.content}` }] };
      }
    });

    // コンテキスト情報（時間、場所、気分、アルコールレベル）を文字列に整形
    // （「コンテキスト」とは、会話の背景情報のことです）
    const contextInfo = `
      現在の会話コンテキスト:
      - 時間: ${new Date(conversation.context.time).toLocaleString('ja-JP')}
      - 場所: ${conversation.context.place}
      - 気分: ${conversation.context.mood}
      - アルコールレベル: ${conversation.context.alcoholLevel}
    `;

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
    const chat = model.startChat({
      history,
      systemInstruction: prompt,
    });

    // メッセージを送信し、応答を取得
    // （空のメッセージを送信することで、AIに会話を続けるよう促します）
    const result = await chat.sendMessage("");
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
