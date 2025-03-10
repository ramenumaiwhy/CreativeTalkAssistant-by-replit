#!/bin/bash

# 必要なパッケージをインストール
echo "Installing dependencies..."
npm install 

# 開発用の依存関係も確実にインストール
echo "Installing dev dependencies..."
npm install tsx esbuild typescript @vercel/node --save-dev

# Vercel環境変数の確認
echo "Setting up environment for Vercel deployment..."
export VERCEL=1
export NODE_ENV=production

# キャッシュクリーンアップを実行して依存関係の問題を回避
echo "Cleaning npm cache..."
npm cache clean --force

echo "Dependencies installed successfully."