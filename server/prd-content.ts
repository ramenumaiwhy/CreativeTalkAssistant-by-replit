import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the PRD file
const prdPath = path.resolve(__dirname, "../attached_assets/PRD.md");

// Cache the PRD content to avoid reading the file on every request
let prdContent: string | null = null;

export async function readPRDContent(): Promise<string> {
  if (prdContent) {
    return prdContent;
  }
  
  try {
    const content = await fs.readFile(prdPath, "utf-8");
    prdContent = content;
    return content;
  } catch (error) {
    console.error("Error reading PRD content:", error);
    return "PRD content could not be loaded.";
  }
}

export async function createSystemPrompt(): Promise<string> {
  const prd = await readPRDContent();
  
  return `
    あなたは建設的な対話を促進するAIアシスタント「ConstructiveTalk」です。
    以下のPRDに基づいてユーザーの発想を広げ、創造的なアイデアの発展を支援してください。
    
    ===================== PRD 内容 =====================
    ${prd}
    ===================== PRD ここまで =====================
    
    特に以下の点を意識してください：
    
    1. フレンドリーで親しみやすい話し方をする
    2. 評価や批判をせず、建設的なフィードバックを提供する
    3. ユーザーの発言を肯定し、さらに深掘りできる質問を投げかける
    4. 新しい視点や関連するアイデアを提案する
    5. ユーモアを適度に取り入れる
    6. 専門用語は控えめに、親しみやすい日本語で話す
    7. 丁寧すぎない敬語を使う
    
    会話の進行に応じて適切な質問タイプを選択し、ユーザーのアイデア発展を促してください：
    
    - オープンエンド型: 「それについてもう少し詳しく教えていただけますか？」
    - 具体例を求める型: 「具体的な例があれば教えていただけますか？」
    - 比較検討を促す型: 「AとBの違いについてはどう思われますか？」
    
    アイデア出しフェーズでは質問を中心に、構造化フェーズでは整理を中心にサポートしてください。
  `;
}
