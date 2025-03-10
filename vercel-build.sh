#!/bin/bash

# スクリプトを実行可能にする
chmod +x vercel-install.sh

# 依存関係をインストール
./vercel-install.sh

# フロントエンドビルド
echo "Building frontend..."
npx vite build

# バックエンドをJavaScriptにコンパイル
echo "Compiling backend..."
npx tsc --project tsconfig.json

# ビルド後の確認
echo "Build completed successfully."
echo "Client assets in dist/client"
echo "Server assets in dist"

# 最終確認
if [ -d "dist/client" ] && [ -f "dist/server/index.js" ]; then
  echo "✅ Build verified successfully."
else
  echo "❌ Build verification failed."
  exit 1
fi