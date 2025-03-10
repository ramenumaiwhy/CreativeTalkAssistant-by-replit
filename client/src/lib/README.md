# ユーティリティとライブラリ

## 概要
このディレクトリには、アプリケーション全体で使用される共通のユーティリティ関数やライブラリの設定が含まれています。ユーティリティ関数とは、特定の処理を再利用可能な形でまとめたものです。これらは「便利な道具箱」のようなもので、アプリケーションの様々な場所から呼び出して使用されます。

## ファイル構造
```
lib/
└── queryClient.ts       # React Queryの設定とAPI通信用の関数
```

## 主要ファイル

### queryClient.ts

このファイルは、データ取得と状態管理のためのReact Queryライブラリの設定を行います。React Queryとは、サーバーからのデータ取得、キャッシュ管理、更新処理などを簡単に行うためのライブラリです。

#### 主な機能

1. **APIリクエスト関数**
   ```typescript
   export async function apiRequest(
     method: string,
     url: string,
     data?: unknown | undefined,
   ): Promise<Response>
   ```
   
   この関数は、サーバーAPIとの通信を行うための汎用的な関数です。HTTPメソッド（GET, POST, PUTなど）、URL、送信データを指定してAPIを呼び出します。
   
   - `method`: HTTPメソッド（「GET」「POST」「PUT」「DELETE」など）
   - `url`: リクエスト先のURL
   - `data`: 送信するデータ（オプション）
   
   これは「郵便局」のようなもので、どこに（URL）、どのような方法で（HTTPメソッド）、何を（データ）送るかを指定します。

2. **クエリ関数ファクトリ**
   ```typescript
   export const getQueryFn: <T>(options: {
     on401: UnauthorizedBehavior;
   }) => QueryFunction<T>
   ```
   
   この関数は、React Queryで使用するクエリ関数を生成します。クエリ関数とは、データを取得するための関数です。
   
   - `on401`: 認証エラー（401）が発生した場合の動作を指定
     - `"returnNull"`: nullを返す（ログインしていない状態として処理）
     - `"throw"`: エラーを投げる（エラー処理を行う）
   
   これは「特別な指示書付きの配達人」のようなもので、データを取りに行く際の詳細な動作を指定します。

3. **QueryClientの設定**
   ```typescript
   export const queryClient = new QueryClient({
     defaultOptions: {
       queries: { ... },
       mutations: { ... },
     },
   });
   ```
   
   この部分は、React Queryの全体的な設定を行います。データの取得方法、キャッシュの扱い方、エラー時の再試行などの動作を定義します。
   
   - `queries`: データ取得（読み取り）の設定
     - `refetchOnWindowFocus`: ウィンドウにフォーカスが戻ったときにデータを再取得するかどうか
     - `staleTime`: データが「古い」と見なされるまでの時間
     - `retry`: エラー時に再試行する回数
   
   - `mutations`: データ更新（書き込み）の設定
     - `retry`: エラー時に再試行するかどうか
   
   これは「会社の業務マニュアル」のようなもので、データをどのように取得し、どのように管理するかの基本方針を定めています。

## 使用方法

### APIリクエストの使用例

```typescript
import { apiRequest } from "@/lib/queryClient";

// GETリクエスト（データ取得）
const fetchData = async () => {
  const response = await apiRequest("GET", "/api/conversations");
  const data = await response.json();
  return data;
};

// POSTリクエスト（データ送信）
const createItem = async (newItem) => {
  const response = await apiRequest("POST", "/api/conversations", newItem);
  const result = await response.json();
  return result;
};
```

### React Queryの使用例

```typescript
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

// データ取得の例
function useConversations() {
  return useQuery({
    queryKey: ["/api/conversations"],
    // queryFnはqueryClientで設定済みのため省略可能
  });
}

// データ更新の例
function useSendMessage() {
  return useMutation({
    mutationFn: (data) => apiRequest("POST", `/api/conversations/${data.conversationId}/messages`, data),
    onSuccess: () => {
      // 成功時にキャッシュを更新
      queryClient.invalidateQueries([`/api/conversations`]);
    },
  });
}
```

## 技術的な背景

### React Query

React Queryは、Reactアプリケーションでのデータ取得と状態管理を簡素化するライブラリです。従来のReduxなどの状態管理ライブラリと比較して、サーバーデータの取得、キャッシュ、同期、更新に特化しています。

主な特徴：
- サーバーデータのキャッシュ管理
- 重複リクエストの排除
- バックグラウンドでの更新
- 古いデータの自動更新
- パフォーマンスの最適化
- メモリ管理

### Fetch API

このライブラリでは、ブラウザ標準のFetch APIを使用してHTTPリクエストを行っています。Fetch APIは、XMLHttpRequest（XHR）の近代的な代替として設計されたもので、Promiseベースのより簡潔なAPIを提供します。 