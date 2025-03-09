import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";

/**
 * Routerコンポーネント
 * 
 * これは「ルーター」と呼ばれるコンポーネントです。
 * ルーターとは、URLに応じて表示する画面を切り替える役割を持ちます。
 * 例えば、「/」（トップページ）にアクセスしたらHomeコンポーネントを表示し、
 * それ以外のURLにアクセスしたらNotFoundコンポーネント（404ページ）を表示します。
 * 
 * これは「道案内」のようなもので、ユーザーがどのURLにアクセスしたかによって、
 * どの画面に案内するかを決めています。
 */
function Router() {
  return (
    <Switch>
      {/* トップページのルート */}
      <Route path="/" component={Home} />
      {/* 上記以外のURLにアクセスした場合は「ページが見つかりません」画面を表示 */}
      <Route component={NotFound} />
    </Switch>
  );
}

/**
 * Appコンポーネント
 * 
 * これはアプリケーションのメインコンポーネントです。
 * アプリ全体の「入り口」となる部分で、以下の役割を持っています：
 * 
 * 1. QueryClientProvider: データの取得や管理を行うための仕組みを提供します
 *    （「データを取ってくる係」のようなものです）
 * 
 * 2. Router: URLに応じて表示する画面を切り替えます
 *    （「道案内係」のようなものです）
 * 
 * 3. Toaster: 通知メッセージを表示するための仕組みを提供します
 *    （「お知らせを出す係」のようなものです）
 */
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
