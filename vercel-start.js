// Vercel用の起動スクリプト

// この環境変数はVercelにデプロイ中であることを示す
process.env.VERCEL = "1";
process.env.NODE_ENV = "production";

// server/index.jsを実行
console.log("Starting server in Vercel environment...");
require('./dist/server/index.js');