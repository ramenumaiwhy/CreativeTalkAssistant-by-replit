// vercel-start.js - Vercel環境用の拡張サーバー起動スクリプト
const path = require('path');
const fs = require('fs');
const express = require('express');

// 環境変数の設定
process.env.VERCEL = process.env.VERCEL || "1";
process.env.NODE_ENV = process.env.NODE_ENV || "production";

/**
 * システム診断：環境とファイルシステムを調査
 */
function diagnoseSystem() {
  console.log("=== 環境診断開始 ===");
  console.log("NODE_ENV:", process.env.NODE_ENV);
  console.log("VERCEL:", process.env.VERCEL);
  console.log("実行ディレクトリ:", process.cwd());
  
  // ルートディレクトリのファイル一覧
  try {
    const rootFiles = fs.readdirSync('./');
    console.log("ルートディレクトリのファイル一覧:");
    rootFiles.forEach(file => console.log(` - ${file}`));
  } catch (err) {
    console.error("ルートディレクトリの読み取りエラー:", err.message);
  }
  
  // 重要なディレクトリの検証
  ['dist', 'dist/client', 'dist/server'].forEach(dir => {
    try {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        console.log(`${dir}ディレクトリの内容 (${files.length}ファイル):`);
        files.forEach(file => console.log(` - ${file}`));
      } else {
        console.warn(`警告: ${dir}ディレクトリが存在しません`);
      }
    } catch (err) {
      console.error(`${dir}ディレクトリ確認エラー:`, err.message);
    }
  });
  
  console.log("=== 環境診断終了 ===");
}

/**
 * ディレクトリ構造を確認・修正
 */
function ensureDirectoryStructure() {
  ['dist', 'dist/client', 'dist/server'].forEach(dir => {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`${dir}ディレクトリを作成しました`);
      } catch (err) {
        console.error(`${dir}ディレクトリの作成に失敗:`, err.message);
      }
    }
  });
  
  // 通常のビルド出力をクライアントディレクトリに移動
  try {
    if (fs.existsSync('./dist/assets') && !fs.existsSync('./dist/client/assets')) {
      fs.cpSync('./dist/assets', './dist/client/assets', { recursive: true });
      console.log('assets ディレクトリをクライアントディレクトリに移動しました');
    }
    
    if (fs.existsSync('./dist/index.html') && !fs.existsSync('./dist/client/index.html')) {
      fs.cpSync('./dist/index.html', './dist/client/index.html');
      console.log('index.html をクライアントディレクトリに移動しました');
    }
  } catch (err) {
    console.error('ファイルのコピー中にエラーが発生:', err.message);
  }
}

// システム診断を実行
diagnoseSystem();

// ディレクトリ構造を確認・修正
ensureDirectoryStructure();

/**
 * アプリケーションサーバーの初期化と起動
 */
function startServer() {
  // サーバーの初期化
  const app = express();
  const port = process.env.PORT || 3000;
  
  // リクエストロギングミドルウェア
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
  
  // 静的ファイルの配信設定
  if (fs.existsSync('./dist/client')) {
    app.use(express.static('./dist/client'));
    console.log('静的ファイル配信を設定: ./dist/client');
  } else {
    console.warn('警告: 静的ファイルディレクトリが見つかりません');
  }
  
  // APIエンドポイント
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      environment: process.env.NODE_ENV,
      vercel: process.env.VERCEL === "1",
      timestamp: new Date().toISOString()
    });
  });
  
  // WebSocketアップグレードの処理
  app.get('/ws', (req, res) => {
    if (req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket') {
      res.status(426).send('WebSocketサポートは現在制限されています');
    } else {
      res.status(400).send('無効なリクエスト');
    }
  });
  
  // 404ハンドラー（API用）
  app.all('/api/*', (req, res) => {
    res.status(404).json({ 
      error: 'API endpoint not found',
      path: req.path
    });
  });
  
  // SPAフォールバック: すべてのルートでindex.htmlを返す
  app.get('*', (req, res) => {
    const indexPath = path.resolve('./dist/client/index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(503).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>アプリケーション起動中</title>
          <style>
            body { font-family: sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; }
            h1 { color: #333; }
            p { line-height: 1.6; color: #666; }
          </style>
        </head>
        <body>
          <h1>アプリケーション準備中</h1>
          <p>アプリケーションは現在準備中です。しばらくしてからもう一度お試しください。</p>
          <p><small>Timestamp: ${new Date().toISOString()}</small></p>
        </body>
        </html>
      `);
    }
  });
  
  // エラーハンドラー
  app.use((err, req, res, next) => {
    console.error('サーバーエラー:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  });
  
  // サーバー起動
  const server = app.listen(port, () => {
    console.log(`サーバーがポート${port}で起動しました`);
  });
  
  return server;
}

// サーバーを起動
const server = startServer();