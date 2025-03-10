#!/bin/bash
set -e

echo "=== Vercel Build Script Started ==="

# 情報出力
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"
echo "Current directory: $(pwd)"

# フロントエンドビルド
echo "=== Building frontend ==="
npm run build

# ディレクトリ構造の確認と作成
echo "=== Verifying directory structure ==="
mkdir -p dist/client
mkdir -p dist/server
mkdir -p server/public

# viteがdistに出力した場合は、dist/clientに移動
if [ -d "dist/assets" ]; then
  echo "Moving build assets to correct location..."
  mkdir -p dist/client/assets
  cp -r dist/assets/* dist/client/assets/ || true
  cp dist/index.html dist/client/ || true
fi

# server/publicにも静的ファイルをコピー
echo "=== Creating server/public directory ==="
cp -r dist/client/* server/public/ || true

# 検証のためにファイル一覧を表示
echo "=== File structure verification ==="
echo "Files in dist directory:"
find dist -type f | sort
echo "---"
echo "Files in server/public directory:"
find server/public -type f 2>/dev/null | sort || echo "No files in server/public"

echo "=== Vercel Build Script Completed Successfully ==="