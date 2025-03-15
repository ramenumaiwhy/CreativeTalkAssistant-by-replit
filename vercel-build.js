// vercel-build.js - Node.jsによるVercel用ビルドスクリプト
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ビルドプロセスの設定
const CLIENT_DIR = path.join(process.cwd(), 'dist', 'client');
const SERVER_DIR = path.join(process.cwd(), 'dist', 'server');

// エラーハンドリング関数
function handleError(message, error) {
  console.error(`🛑 ${message}:`);
  if (error) console.error(error);
  process.exit(1);
}

// ディレクトリ作成関数
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    } catch (error) {
      handleError(`Failed to create directory ${dir}`, error);
    }
  }
}

// コマンド実行関数
function runCommand(command, errorMessage) {
  try {
    console.log(`📦 Running: ${command}`);
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ Command completed successfully`);
    return true;
  } catch (error) {
    handleError(errorMessage, error);
    return false;
  }
}

// ファイル移動関数
function moveFiles(source, destination) {
  if (!fs.existsSync(source)) {
    console.warn(`⚠️ Source does not exist: ${source}`);
    return false;
  }
  
  if (!fs.existsSync(path.dirname(destination))) {
    ensureDir(path.dirname(destination));
  }
  
  try {
    if (fs.statSync(source).isDirectory()) {
      // Recursively copy directory
      fs.cpSync(source, destination, { recursive: true });
    } else {
      // Copy file
      fs.copyFileSync(source, destination);
    }
    console.log(`✅ Moved from ${source} to ${destination}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to move ${source} to ${destination}:`, error);
    return false;
  }
}

// ビルドプロセス開始
console.log('🚀 Starting Vercel build process...');

// ステップ 1: ディレクトリ構造の確保
console.log('📁 Ensuring directory structure...');
ensureDir(CLIENT_DIR);
ensureDir(SERVER_DIR);

// ステップ 2: ビルドプロセス - クライアントサイド
console.log('🔨 Building client-side...');
if (!runCommand('npx vite build', 'Failed to build client-side application')) {
  process.exit(1);
}

// ステップ 3: ビルドプロセス - サーバーサイド
console.log('🔨 Building server-side...');
if (!runCommand(
  'npx esbuild server/index.ts --platform=node --packages=external --bundle --format=cjs --outdir=dist/server', 
  'Failed to build server-side application'
)) {
  process.exit(1);
}

// ステップ 4: ビルド出力ファイルの移動・整理
console.log('📦 Moving build artifacts...');

// viteのビルド出力をdist/clientに移動
if (fs.existsSync('./dist/assets')) {
  moveFiles('./dist/assets', `${CLIENT_DIR}/assets`);
}

if (fs.existsSync('./dist/index.html')) {
  moveFiles('./dist/index.html', `${CLIENT_DIR}/index.html`);
}

// サーバースクリプトが存在することを確認
if (!fs.existsSync(`${SERVER_DIR}/index.js`)) {
  console.warn('⚠️ Server index.js not found in build output');
}

// server.jsのコピー（フォールバック用）
moveFiles('./server.js', './dist/server.js');

// ビルド完了
console.log('✅ Build process completed successfully');