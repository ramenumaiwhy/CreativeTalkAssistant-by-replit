// server.js - シンプルなNode.js Expressサーバー (ESモジュール形式)
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ESモジュールでの__dirnameと__filenameの代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Expressアプリの初期化
const app = express();
const port = process.env.PORT || 3001;

// 環境変数とシステム状態の出力
console.log('Server starting with:');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('- Current directory:', process.cwd());
console.log('- Using port:', port);
try {
  console.log('- Available files:', fs.readdirSync('.').join(', '));
} catch (err) {
  console.warn('Unable to list directory content:', err.message);
}

// JSONボディパーサー
app.use(express.json());

// クライアントディレクトリの設定
const clientDir = path.join(process.cwd(), 'dist', 'client');

// 静的ファイルの配信設定
if (fs.existsSync(clientDir)) {
  app.use(express.static(clientDir));
  console.log('Serving static files from', clientDir);
} else {
  console.warn('Warning: client directory not found -', clientDir);
  // ビルドされていない場合に備えてクライアントディレクトリを作成
  try {
    fs.mkdirSync(clientDir, { recursive: true });
    console.log('Created client directory:', clientDir);
  } catch (err) {
    console.error('Failed to create client directory:', err);
  }
}

// モジュール形式検出
const isESM = true; // ESモジュールとして実行されているので常にtrue
console.log('Module format: ESM');

// サーバーサイドのモジュールをロードする試み
let serverModule = null;

// トップレベルのawaitを非同期関数内に移動
(async function loadServerModule() {
  try {
    // ビルド済みのサーバーモジュールが存在する場合それを使用
    const serverPath = path.join(process.cwd(), 'dist', 'server', 'index.js');
    if (fs.existsSync(serverPath)) {
      console.log('Loading server module from:', serverPath);
      // ESMではdynamic importを使用
      serverModule = await import(serverPath);
      console.log('Server module loaded successfully');
    } else {
      console.log('Server module not found at:', serverPath);
    }
  } catch (err) {
    console.error('Failed to load server module:', err);
  }
})();

// 基本的なAPI - ヘルスチェック
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    moduleFormat: 'ESM'
  });
});

// 新しいAPI - サーバーステータス
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    serverReady: true,
    nextScreen: '/chat'  // クライアントに次の画面を指示
  });
});

// 新しいAPI - チャット初期化用
app.post('/api/init-chat', (req, res) => {
  // 新しい会話IDを生成（実際のIDはサーバーモジュールで生成されるべきですが、
  // ここではシンプルな一意のIDを生成します）
  const conversationId = Date.now().toString(36) + Math.random().toString(36).substring(2);

  console.log('新しい会話を初期化しました:', conversationId);

  // 初期化が完了したことを示すレスポンスを返す
  res.json({
    success: true,
    conversationId: conversationId,
    redirect: `/chat?conversation=${conversationId}`
  });
});

// 基本的なAPI - 会話一覧
app.get('/api/conversations', (req, res) => {
  console.log('GET /api/conversations called');

  // サーバーモジュールがロードされていればそれを使用
  if (serverModule && typeof serverModule.getConversations === 'function') {
    try {
      const conversations = serverModule.getConversations();
      return res.json(conversations);
    } catch (err) {
      console.error('Error getting conversations from server module:', err);
    }
  }

  // フォールバック: 空の配列を返す
  res.json([]);
});

// Google APIキーの存在確認API
app.get('/api/check-google-api', (req, res) => {
  const hasGoogleApiKey = !!process.env.GOOGLE_API_KEY;
  res.json({
    hasGoogleApiKey,
    timestamp: new Date().toISOString()
  });
});

// SPA向けのフォールバックルート
app.get('*', (req, res) => {
  // APIリクエストに対しては404を返す
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }

  // それ以外のリクエストはindex.htmlにフォールバック
  const indexPath = path.join(clientDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(503).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>アプリケーション準備中</title>
        <style>
          body { font-family: sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; }
          h1 { color: #333; }
          p { line-height: 1.6; color: #666; }
        </style>
      </head>
      <body>
        <h1>アプリケーションは準備中です</h1>
        <p>アプリケーションは現在初期化中です。しばらくお待ちください。</p>
        <p><small>タイムスタンプ: ${new Date().toISOString()}</small></p>
      </body>
      </html>
    `);
  }
});

// エラーハンドラー
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// サーバー起動（直接実行の場合のみ）
// ESMでは import.meta.url を使用して現在のモジュールを判断
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

// モジュールとしてエクスポート
export default app;