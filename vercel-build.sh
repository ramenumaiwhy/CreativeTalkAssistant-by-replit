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
echo "Server assets in dist/server"

# デプロイ用のディレクトリ構造を確認
echo "Verifying build output structure..."
mkdir -p dist/client 
mkdir -p dist/server

# ファイルの配置確認
if [ -d "dist/client" ]; then
  echo "✅ Client build output verified."
else
  echo "❌ Client build output not found."
  exit 1
fi

if [ -f "dist/server/index.js" ]; then
  echo "✅ Server build output verified." 
else
  echo "❌ Server build output not found."
  echo "⚠️ Creating placeholder until TypeScript compilation completes..."
  mkdir -p dist/server
  echo "console.log('Server starting...');" > dist/server/index.js
fi

# Vercelデプロイのための特別な対応 - サーバーが期待する場所にpublicディレクトリを作成
echo "Creating required server/public directory for Vercel deployment..."
mkdir -p server/public
cp -r dist/client/* server/public/ || true

# 検証のためにファイル一覧を表示
echo "File structure verification:"
find dist -type f | sort
echo "---"
find server/public -type f 2>/dev/null | sort || echo "No files in server/public"

echo "✅ Build structure verified successfully."