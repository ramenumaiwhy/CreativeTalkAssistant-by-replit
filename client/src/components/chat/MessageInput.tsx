/**
 * MessageInput コンポーネント
 * 
 * このファイルは、チャットメッセージを入力するためのフォームを提供するReactコンポーネントを定義しています。
 * Reactコンポーネントとは、ユーザーインターフェースを構築するための再利用可能な部品です。
 * このコンポーネントは「チャットアプリのメッセージ入力欄」のような役割を持っています。
 */
import { useState, useRef, useEffect } from "react";
import { Paperclip, Send } from "lucide-react";

/**
 * MessageInputProps インターフェース
 * 
 * インターフェースとは、コンポーネントが受け取るデータの形（型）を定義するものです。
 * これは「レシピの材料リスト」のようなもので、このコンポーネントが正しく動作するために
 * 必要な情報を指定しています。
 * 
 * @property onSendMessage - メッセージが送信されたときに呼び出される関数
 * @property disabled - 入力フォームを無効にするかどうかのフラグ（オプション）
 */
interface MessageInputProps {
  onSendMessage: (content: string) => void;  // メッセージ送信時に呼び出される関数
  disabled?: boolean;  // 入力を無効にするかどうか（?は省略可能を意味する）
}

/**
 * MessageInput コンポーネント
 * 
 * ユーザーがメッセージを入力して送信するためのフォームを提供するコンポーネントです。
 * テキストエリアの自動リサイズ機能や、Enterキーでの送信機能などを実装しています。
 * 
 * @param onSendMessage - メッセージが送信されたときに呼び出される関数
 * @param disabled - 入力フォームを無効にするかどうか
 * @returns JSX要素（画面に表示される内容）
 */
export default function MessageInput({ onSendMessage, disabled }: MessageInputProps) {
  // useState - 状態を管理するためのReactフック
  // 状態（State）とは、コンポーネントが保持する変化するデータのことです
  // これは「変更可能な記憶領域」のようなもので、ユーザーの入力などを保存します
  const [message, setMessage] = useState("");  // メッセージの内容を保持する状態

  // useRef - 要素への参照を保持するためのReactフック
  // これは「特定の場所を指し示す付箋」のようなもので、特定のDOM要素に直接アクセスするために使います
  const textareaRef = useRef<HTMLTextAreaElement>(null);  // テキストエリア要素への参照

  /**
   * テキストエリアのサイズを内容に合わせて調整する関数
   * 
   * この関数は、テキストエリアの高さを入力されたテキストの量に応じて
   * 自動的に調整します（最大200pxまで）。
   */
  const resizeTextarea = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;  // テキストエリアが存在しない場合は何もしない

    // 高さをリセットしてから、内容に合わせて再設定
    textarea.style.height = "auto";  // 一度高さをリセット
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;  // 内容に合わせて高さを設定（最大200px）
  };

  // useEffect - 副作用を実行するためのReactフック
  // 副作用とは、コンポーネントのレンダリング以外の処理（ここではDOM操作）のことです
  useEffect(() => {
    // メッセージが変更されるたびにテキストエリアのサイズを調整
    resizeTextarea();
  }, [message]);  // 依存配列 - messageが変更されたときだけ実行

  /**
   * メッセージを送信する関数
   * 
   * フォームが送信されたときに呼び出される関数です。
   * メッセージが空でなく、フォームが無効化されていない場合にメッセージを送信します。
   * 
   * @param e - フォーム送信イベント
   */
  const handleSendMessage = (e: React.FormEvent) => {
    // preventDefault - イベントのデフォルト動作（ページのリロードなど）を防止するメソッド
    e.preventDefault();  // フォーム送信によるページリロードを防止

    // メッセージが空でなく、フォームが無効化されていない場合
    if (message.trim() && !disabled) {
      onSendMessage(message);  // メッセージを送信
      setMessage("");  // 入力欄をクリア
    }
  };

  /**
   * キーボード入力を処理する関数
   * 
   * テキストエリアでキーが押されたときに呼び出される関数です。
   * Enterキーが押された場合（Shiftキーと一緒でない場合）にメッセージを送信します。
   * 
   * @param e - キーボードイベント
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enterキーが押され、かつShiftキーが押されていない場合
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();  // デフォルトの改行動作を防止
      handleSendMessage(e);  // メッセージを送信
    }
  };

  return (
    // JSX - JavaScriptの中にHTMLのような記法を書けるようにする構文
    <div className="border-t border-gray-200 bg-white p-4">
      <div className="max-w-3xl mx-auto">
        {/* onSubmit - フォームが送信されたときに実行される関数 */}
        <form className="relative" onSubmit={handleSendMessage}>
          {/* テキストエリア（複数行入力できる入力欄） */}
          <textarea
            ref={textareaRef}  // useRefで作成した参照を割り当て
            value={message}  // 入力値を状態から取得
            onChange={(e) => setMessage(e.target.value)}  // 入力値が変更されたときに状態を更新
            onKeyDown={handleKeyDown}  // キーが押されたときの処理
            rows={1}  // 初期行数
            placeholder="メッセージを入力..."  // 何も入力されていないときに表示されるヒント
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"  // スタイル
            disabled={disabled}  // 無効化状態
          />
          {/* 送信ボタンなどのコントロール */}
          <div className="absolute right-2 bottom-2 flex items-center space-x-1">
            {/* 添付ファイルボタン（現在は機能していない） */}
            <button
              type="button"  // ボタンの種類
              className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"  // スタイル
              title="アタッチメント"  // ツールチップ
              disabled={disabled}  // 無効化状態
            >
              <Paperclip className="h-5 w-5" />  {/* クリップアイコン */}
            </button>
            {/* 送信ボタン */}
            <button
              type="submit"  // 送信ボタンとして機能
              className="p-1 rounded-full text-primary-600 hover:text-primary-700 hover:bg-primary-50"  // スタイル
              disabled={disabled || !message.trim()}  // 無効化状態（フォームが無効か、メッセージが空の場合）
            >
              <Send className="h-5 w-5" />  {/* 送信アイコン */}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
