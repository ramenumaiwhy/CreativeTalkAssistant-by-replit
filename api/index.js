// api/index.js - Vercel API Functions エントリーポイント

// 必要なモジュールを要求
const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');

// 環境情報を出力
console.log('Vercel Functions API started');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Current directory:', process.cwd());

// JSONボディパーサーの設定
app.use(express.json());

// 基本のAPI
app.get('/api', (req, res) => {
  res.json({
    message: 'API is working',
    timestamp: new Date().toISOString()
  });
});

// ヘルスチェックAPI
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// 会話一覧API
app.get('/api/conversations', (req, res) => {
  console.log('GET /api/conversations called');
  // 空の配列を返す（サーバーレス関数のデモ用）
  res.json([]);
});

// エラーハンドラー
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// モジュールとしてエクスポート
module.exports = app;