// server-esm.js - ESM互換性のためのサーバーエントリーポイント
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// ESM環境でのファイルパス解決
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 環境変数の設定
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Expressアプリの初期化
const app = express();
const port = process.env.PORT || 3000;

// システム情報の出力（デバッグ用）
console.log('Server starting with:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- Current directory:', process.cwd());
console.log('- Available files:', fs.readdirSync('.').join(', '));

// 静的ファイルの配信設定
const clientDir = path.join(process.cwd(), 'dist', 'client');
if (fs.existsSync(clientDir)) {
  app.use(express.static(clientDir));
  console.log('Serving static files from', clientDir);
} else {
  console.warn('Warning: client directory not found -', clientDir);
}

// JSONボディパーサー
app.use(express.json());

// 基本的なAPI - ヘルスチェック
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    module: 'ESM'
  });
});

// 基本的なAPI - 会話一覧
app.get('/api/conversations', (req, res) => {
  res.json([]);
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
        <title>Application Startup</title>
        <style>
          body { font-family: sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; }
          h1 { color: #333; }
          p { line-height: 1.6; color: #666; }
        </style>
      </head>
      <body>
        <h1>Application is starting up</h1>
        <p>The application is currently initializing. Please check back shortly.</p>
        <p><small>Timestamp: ${new Date().toISOString()}</small></p>
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

// サーバー起動
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default app;