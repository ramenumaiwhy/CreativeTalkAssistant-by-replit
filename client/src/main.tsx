import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// キャッシュをクリアするコード
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
        for (let registration of registrations) {
            registration.unregister();
            console.log('サービスワーカーを登録解除しました');
        }
    });
}

// ページロード時にキャッシュを無効化
window.addEventListener('load', function () {
    console.log('ページがロードされました - キャッシュをバイパスします');

    // ローカルストレージからリダイレクト情報を確認
    const redirectTarget = localStorage.getItem('redirectTarget');
    if (redirectTarget) {
        console.log('保存されたリダイレクト先を検出:', redirectTarget);
        localStorage.removeItem('redirectTarget');

        // 現在のURLがリダイレクト先と異なる場合のみリダイレクト
        if (window.location.pathname !== redirectTarget) {
            window.location.href = redirectTarget;
        }
    }
});

createRoot(document.getElementById("root")!).render(<App />);
