/**
 * MessageList コンポーネント
 * 
 * このファイルは、チャットメッセージの一覧を表示するためのReactコンポーネントを定義しています。
 * Reactコンポーネントとは、ユーザーインターフェースを構築するための再利用可能な部品です。
 * このコンポーネントは「チャットアプリのメッセージ履歴表示部分」のような役割を持っています。
 */
import { useRef, useEffect } from "react";
import { Message } from "@/types";
import { Loader2 } from "lucide-react";

/**
 * MessageListProps インターフェース
 * 
 * インターフェースとは、コンポーネントが受け取るデータの形（型）を定義するものです。
 * これは「レシピの材料リスト」のようなもので、このコンポーネントが正しく動作するために
 * 必要な情報を指定しています。
 * 
 * @property messages - 表示するメッセージの配列
 * @property isTyping - AIが応答を生成中かどうか
 */
interface MessageListProps {
  messages: Message[];  // メッセージの配列
  isTyping: boolean;    // 入力中（応答生成中）かどうか
}

/**
 * MessageList コンポーネント
 * 
 * チャットメッセージの一覧を表示し、自動スクロール機能を提供するコンポーネントです。
 * ユーザーとAIのメッセージを異なるスタイルで表示し、AIが応答を生成中の場合は
 * 「入力中」のインジケーターを表示します。
 * 
 * @param messages - 表示するメッセージの配列
 * @param isTyping - AIが応答を生成中かどうか
 * @returns JSX要素（画面に表示される内容）
 */
export default function MessageList({ messages, isTyping }: MessageListProps) {
  // useRef - 要素への参照を保持するためのReactフック
  // これは「特定の場所を指し示す付箋」のようなもので、特定のDOM要素に直接アクセスするために使います
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // useEffect - 副作用を実行するためのReactフック
  // 副作用とは、コンポーネントのレンダリング以外の処理（ここではスクロール操作）のことです
  // これは「特定の条件で自動的に実行される指示書」のようなものです
  useEffect(() => {
    // 新しいメッセージが追加されるたびに、一番下にスクロールする
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]); // 依存配列 - messagesが変更されたときだけ実行

  // ガード節 - messagesが未定義または空の場合に対応
  // これは「安全確認」のようなもので、データがない場合のエラーを防ぎます
  const hasMessages = messages && messages.length > 0;

  return (
    // JSX - JavaScriptの中にHTMLのような記法を書けるようにする構文
    // className - CSSクラスを指定するための属性（HTMLのclassに相当）
    <div className="flex-1 overflow-y-auto p-4 space-y-6" id="chat-messages">
      {/* メッセージがない場合のプレースホルダー表示 */}
      {!hasMessages && (
        <div className="py-8 text-center text-gray-500">
          <p>会話を始めましょう</p>
        </div>
      )}

      {/* メッセージがある場合、それぞれのメッセージをマップ（変換）して表示 */}
      {/* map関数 - 配列の各要素に対して同じ処理を適用し、新しい配列を作成する関数 */}
      {hasMessages &&
        messages.map((message) => (
          // key属性 - Reactが要素を識別するための一意の値
          // これは「リストの各項目につけるラベル」のようなもので、Reactのパフォーマンス最適化に必要です
          <div
            key={message.id}
            className={`max-w-3xl mx-auto ${
              // 三項演算子 - 条件 ? 真の場合の値 : 偽の場合の値
              // ユーザーのメッセージは右側、それ以外は左側に表示
              message.role === 'user'
                ? 'flex justify-end animate-fade-in'
                : 'flex animate-fade-in'
              }`}
          >
            {/* ユーザーのメッセージ */}
            {message.role === 'user' ? (
              <div className="bg-gray-100 rounded-lg p-3 max-w-lg">
                {/* whitespace-pre-wrap - 改行や空白を保持してテキストを表示するCSSクラス */}
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            ) : message.role === 'system' ? (
              // システムメッセージ（AIからの特別なメッセージ）
              <div className="max-w-3xl mx-auto bg-primary-50 rounded-lg p-4 border border-primary-100 animate-fade-in">
                <p className="text-sm text-primary-800 whitespace-pre-wrap">{message.content}</p>
              </div>
            ) : (
              // AIのメッセージ
              <div className="bg-white rounded-lg p-3 max-w-lg border border-gray-200 shadow-sm">
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            )}
          </div>
        ))
      }

      {/* AIが入力中（応答生成中）の表示 */}
      {isTyping && (
        <div className="max-w-3xl mx-auto flex animate-fade-in">
          <div className="bg-white rounded-lg p-3 max-w-lg border border-gray-200 shadow-sm">
            {/* 点滅するドットでタイピング中を表現 */}
            <div className="flex items-center space-x-2">
              {/* animate-pulse - 要素をゆっくり点滅させるアニメーション */}
              <div className="bg-gray-200 w-2 h-2 rounded-full animate-pulse"></div>
              <div className="bg-gray-200 w-2 h-2 rounded-full animate-pulse delay-150"></div>
              <div className="bg-gray-200 w-2 h-2 rounded-full animate-pulse delay-300"></div>
            </div>
          </div>
        </div>
      )}

      {/* 自動スクロールのための参照ポイント */}
      {/* ref属性 - useRefフックで作成した参照を要素に割り当てる */}
      <div ref={messagesEndRef} />
    </div>
  );
}
