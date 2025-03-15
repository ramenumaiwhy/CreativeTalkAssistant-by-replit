import { useState, useEffect } from "react";
import { useLocation } from "wouter";

/**
 * ローディング画面コンポーネント
 * 
 * このコンポーネントはアプリケーションの起動時に表示される画面です。
 * サーバーの準備状態を確認し、準備ができたら「続行」ボタンを表示します。
 * ボタンをクリックすると、チャット画面に移動します。
 */
export default function LoadingScreen() {
    // サーバーの状態を管理する変数（'loading', 'ready', 'error'のいずれか）
    const [serverStatus, setServerStatus] = useState('loading');

    // 画面遷移のためのフック（画面を切り替えるための機能）
    const [, setLocation] = useLocation();

    /**
     * サーバーの状態を定期的に確認する効果
     * 
     * このuseEffectは、コンポーネントが表示されたときに実行され、
     * サーバーの状態を定期的に確認します。
     */
    useEffect(() => {
        // サーバーの状態を確認する関数
        const checkServerStatus = async () => {
            try {
                // サーバーにステータスを問い合わせる
                const response = await fetch('/api/status');
                const data = await response.json();

                // デバッグ用にコンソールに出力
                console.log('サーバーステータス確認:', data);

                // サーバーの準備ができていれば状態を'ready'に更新
                if (data.status === 'ready') {
                    setServerStatus('ready');
                }
            } catch (error) {
                // エラーが発生した場合は状態を'error'に更新
                console.error('サーバー状態確認エラー:', error);
                setServerStatus('error');
            }
        };

        // WebSocketエラーを処理するためのイベントリスナー
        const handleWebSocketError = (event: Event) => {
            console.log('WebSocketエラーを検出しました - 無視して続行します');
            // WebSocketエラーを無視して、アプリケーションの読み込みを続行
        };

        // WebSocketエラーイベントをグローバルに捕捉
        window.addEventListener('error', handleWebSocketError);

        // 初回実行
        checkServerStatus();

        // 3秒ごとに状態を確認
        const interval = setInterval(checkServerStatus, 3000);

        // コンポーネントがアンマウントされたときにインターバルとイベントリスナーをクリア
        return () => {
            clearInterval(interval);
            window.removeEventListener('error', handleWebSocketError);
        };
    }, []);

    /**
     * 続行ボタンがクリックされたときの処理
     * 
     * この関数は「続行」ボタンがクリックされたときに呼び出され、
     * チャット画面に移動します。
     */
    const handleContinue = async () => {
        console.log('続行ボタンがクリックされました');

        try {
            // チャット初期化APIを呼び出し
            const response = await fetch('/api/init-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();

            if (data.success && data.redirect) {
                console.log('チャット初期化成功、リダイレクト先:', data.redirect);
                // 強制的にページをリロード
                window.location.href = data.redirect;
            } else {
                // フォールバック：単純なルート変更
                window.location.href = '/chat';
            }
        } catch (error) {
            console.error('チャット初期化エラー:', error);
            // エラー時のフォールバック
            window.location.href = '/chat';
        }
    };

    // 画面のレイアウトと表示内容
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 text-center">
            {/* ロゴ画像（実際の画像パスに置き換えてください） */}
            <div className="w-20 h-20 mb-6">
                <svg viewBox="0 0 24 24" className="w-full h-full text-gray-700">
                    <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
                </svg>
            </div>

            {/* アプリケーションのタイトルと説明 */}
            <h1 className="text-2xl font-bold text-gray-800 mb-2">ConstructiveTalk</h1>
            <p className="text-gray-600 mb-8">創造的な対話を促進するAIアシスタントアプリケーション</p>

            {/* サーバーの状態に応じて表示を切り替え */}
            {serverStatus === 'loading' && (
                <div className="mb-4 px-4 py-2 bg-blue-100 text-blue-800 rounded-full">
                    サーバー起動中...
                </div>
            )}

            {serverStatus === 'ready' && (
                <>
                    <div className="mb-4 px-4 py-2 bg-green-100 text-green-800 rounded-full">
                        サーバー準備完了
                    </div>
                    <p className="mb-6 text-gray-600">アプリケーションの準備ができました。</p>
                    <button
                        onClick={handleContinue}
                        className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50"
                        id="continue-button"
                    >
                        続行
                    </button>
                </>
            )}

            {serverStatus === 'error' && (
                <>
                    <div className="mb-4 px-4 py-2 bg-red-100 text-red-800 rounded-full">
                        接続エラー
                    </div>
                    <p className="mb-6 text-gray-600">サーバーとの接続に問題があります。</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg shadow transition-colors font-medium"
                    >
                        再試行
                    </button>
                </>
            )}

            {/* フッター */}
            <div className="mt-10 text-gray-400 text-sm">
                ConstructiveTalk © 2025
            </div>
        </div>
    );
} 