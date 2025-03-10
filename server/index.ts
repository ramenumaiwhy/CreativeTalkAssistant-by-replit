import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

/**
 * サーバーアプリケーションの作成と設定
 * 
 * ここでは、Webサーバーを作成し、基本的な設定を行っています。
 * Expressは、Node.jsでWebサーバーを簡単に作るためのフレームワーク（道具セット）です。
 */

// Expressアプリケーションを作成
// （これは「お店を開く」ようなもので、これからお客さん（ユーザー）を迎える準備をします）
const app = express();

// JSONデータを扱えるようにする設定
// （JSONとは、データを整理して送受信するための形式です。「伝言メモ」のようなものです）
app.use(express.json());

// フォームデータを扱えるようにする設定
// （Webページのフォームから送信されるデータを処理できるようにします）
app.use(express.urlencoded({ extended: false }));

/**
 * リクエストのログ記録ミドルウェア
 * 
 * このミドルウェアは、APIへのリクエストを記録（ログ）します。
 * 「ミドルウェア」とは、リクエストとレスポンスの間に挟まる処理のことで、
 * 「受付係」のような役割を果たします。
 * 
 * ここでは、以下の情報を記録しています：
 * - リクエストの種類（GET, POST など）
 * - リクエストのパス（URL）
 * - レスポンスのステータスコード（成功か失敗かなど）
 * - 処理にかかった時間
 * - レスポンスの内容（一部）
 */
app.use((req, res, next) => {
  // リクエスト開始時間を記録
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // レスポンスのjsonメソッドを上書きして、レスポンス内容をキャプチャ
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  // レスポンスが完了したときの処理
  res.on("finish", () => {
    // 処理時間を計算
    const duration = Date.now() - start;
    // APIリクエストの場合のみログを記録
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      // ログが長すぎる場合は省略
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      // ログを出力
      log(logLine);
    }
  });

  // 次のミドルウェアに処理を渡す
  next();
});

/**
 * サーバーの起動処理
 * 
 * この部分は、サーバーを実際に起動し、リクエストを受け付ける準備をします。
 * 「お店を開店する」ような作業です。
 */
(async () => {
  // ルート（URLとそれに対応する処理）を登録
  // （「このURLにアクセスしたら、この処理をする」という対応表を作ります）
  const server = await registerRoutes(app);

  /**
   * エラーハンドリングミドルウェア
   * 
   * このミドルウェアは、アプリケーション内でエラーが発生した場合に
   * クライアント（ブラウザなど）に適切なエラーメッセージを返します。
   * 「トラブル対応係」のような役割です。
   */
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    // エラーのステータスコードとメッセージを取得
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // クライアントにエラー情報を返す
    res.status(status).json({ message });
    throw err;
  });

  // 開発環境の場合はVite（フロントエンド開発ツール）の設定を行う
  // （開発中は特別な設定が必要です）
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    // 本番環境の場合は静的ファイルを提供する設定を行う
    // （「静的ファイル」とは、HTMLやCSS、画像など、変化しないファイルのことです）
    serveStatic(app);
  }

  // サーバーをポートで起動（環境変数やVercelでのデプロイに対応）
  // （「ポート」とは、コンピュータの「入り口」のようなものです）
  const port = process.env.PORT || 5000;
  server.listen({
    port: Number(port),
    host: "0.0.0.0",  // すべてのネットワークインターフェースでリッスン
    reusePort: true,  // ポートの再利用を許可
  }, () => {
    // サーバー起動成功時のメッセージ
    log(`serving on port ${port}`);
  });
})();
