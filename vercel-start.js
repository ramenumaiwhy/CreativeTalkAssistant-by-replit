// Vercel用の起動スクリプト

// この環境変数はVercelにデプロイ中であることを示す
process.env.VERCEL = "1";
process.env.NODE_ENV = "production";

// サーバーの起動情報をログに出力
console.log("Starting server in Vercel environment...");
console.log("Current directory:", process.cwd());
console.log("Files in current directory:");
require('fs').readdirSync('./').forEach(file => {
  console.log(' - ' + file);
});

// dist/serverディレクトリが存在するか確認
try {
  console.log("Files in dist directory:");
  if (require('fs').existsSync('./dist')) {
    require('fs').readdirSync('./dist').forEach(file => {
      console.log(' - ' + file);
    });
  } else {
    console.log("dist directory does not exist");
  }
} catch (err) {
  console.error("Error checking dist directory:", err);
}

// expressアプリを直接初期化して起動
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// 静的ファイルを提供
if (require('fs').existsSync('./dist/client')) {
  app.use(express.static('./dist/client'));
}

// 基本的なAPIエンドポイント
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// すべてのルートでindex.htmlを返す（SPA用）
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  if (require('fs').existsSync('./dist/client/index.html')) {
    res.sendFile(require('path').resolve('./dist/client/index.html'));
  } else {
    res.send('Application is starting up. Please check back shortly.');
  }
});

// サーバーを起動
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});