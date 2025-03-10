#!/bin/bash

# 必要なパッケージをインストール
echo "Installing dependencies..."
npm install 

# 開発用の依存関係も確実にインストール
echo "Installing dev dependencies..."
npm install tsx esbuild typescript --save-dev

echo "Dependencies installed successfully."