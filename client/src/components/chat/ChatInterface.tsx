import { useState, useEffect } from "react";
import { useConversation, useSendMessage } from "@/hooks/use-conversation";
import { Message } from "@/types";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { Loader2, Info, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * チャットインターフェースのプロパティ（設定項目）
 * 
 * このインターフェースは、ChatInterfaceコンポーネントが受け取るプロパティを定義しています。
 * プロパティとは、コンポーネントに渡す「設定」や「データ」のことです。
 * 
 * @property conversationId - 表示する会話のID
 * @property onOpenContext - コンテキストパネルを開くときに呼び出される関数
 * @property onExport - エクスポートボタンがクリックされたときに呼び出される関数
 */
interface ChatInterfaceProps {
  conversationId: string;
  onOpenContext: () => void;
  onExport: () => void;
}

/**
 * チャットインターフェースコンポーネント
 * 
 * このコンポーネントは、ユーザーとAIの会話を表示し、メッセージの送信を可能にします。
 * 画面は以下の部分から構成されています：
 * 
 * 1. 上部バー：会話のタイトルや操作ボタンを表示
 * 2. メッセージリスト：会話の履歴を表示
 * 3. 入力エリア：新しいメッセージを入力して送信
 * 
 * @param conversationId - 表示する会話のID
 * @param onOpenContext - コンテキストパネルを開く関数
 * @param onExport - エクスポート機能を実行する関数
 */
export default function ChatInterface({ conversationId, onOpenContext, onExport }: ChatInterfaceProps) {
  // 会話データを取得するためのフック
  // （指定されたIDの会話情報を取得します）
  const { data: conversation, isLoading } = useConversation(conversationId);

  // メッセージを送信するためのフック
  // （新しいメッセージをサーバーに送信する機能です）
  const { mutate: sendMessage, isPending } = useSendMessage();

  // トースト通知を表示するためのフック
  // （画面に通知メッセージを表示する機能です）
  const { toast } = useToast();

  // 自動保存の時間を表示するための状態
  // （「いつ保存されたか」を表示するための変数です）
  const [autoSaveTime, setAutoSaveTime] = useState<string>("たった今");

  /**
   * 自動保存時間の表示を更新する効果
   * 
   * 30秒ごとに、最後に保存された時間からの経過時間を計算し、
   * 「たった今」「1分前」「○分前」のような形式で表示します。
   * これにより、ユーザーは最後にいつ会話が保存されたかを知ることができます。
   */
  useEffect(() => {
    // 30秒ごとに実行するタイマーを設定
    const timer = setInterval(() => {
      if (conversation?.lastSaved) {
        // 最後の保存時間を取得
        const lastSaved = new Date(conversation.lastSaved);
        const now = new Date();
        // 現在時刻との差を分単位で計算
        const diffMinutes = Math.round((now.getTime() - lastSaved.getTime()) / 60000);

        // 経過時間に応じて表示を変更
        if (diffMinutes < 1) {
          setAutoSaveTime("たった今");
        } else if (diffMinutes === 1) {
          setAutoSaveTime("1分前");
        } else {
          setAutoSaveTime(`${diffMinutes}分前`);
        }
      }
    }, 30000); // 30秒（30000ミリ秒）ごとに実行

    // コンポーネントがアンマウント（画面から消える）されたときにタイマーをクリア
    return () => clearInterval(timer);
  }, [conversation?.lastSaved]); // 最後の保存時間が変わったときに効果を再実行

  /**
   * メッセージを送信する関数
   * 
   * ユーザーが入力したメッセージをサーバーに送信し、AIからの返答を取得します。
   * 送信に失敗した場合は、エラーメッセージを表示します。
   * 
   * @param content - 送信するメッセージの内容
   */
  const handleSendMessage = (content: string) => {
    // 空のメッセージは送信しない
    if (!content.trim()) return;

    // メッセージを送信
    sendMessage(
      { conversationId, content },
      {
        // エラーが発生した場合の処理
        onError: (error) => {
          // トースト通知でエラーメッセージを表示
          toast({
            title: "メッセージ送信エラー",
            description: error.message || "メッセージを送信できませんでした。",
            variant: "destructive",
          });
        },
      }
    );
  };

  // データ読み込み中の表示
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  // 会話が見つからない場合の表示
  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">会話が見つかりませんでした</p>
        </div>
      </div>
    );
  }

  // 通常の表示（会話が読み込まれている場合）
  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* コンテキストバー（上部） */}
      <div className="bg-gray-50 border-b border-gray-200 p-3 flex items-center justify-between">
        <div className="flex items-center">
          {/* モバイル用メニューボタン（小さい画面でのみ表示） */}
          <button className="md:hidden mr-2 p-1 rounded-md hover:bg-gray-200 text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {/* 会話のタイトル */}
          <h2 className="font-medium text-gray-800">{conversation.title}</h2>
        </div>

        {/* 右側のボタン群 */}
        <div className="flex items-center space-x-2">
          {/* 自動保存の時間表示 */}
          <span className="text-xs text-gray-500">自動保存: {autoSaveTime}</span>

          {/* コンテキストパネルを開くボタン */}
          <button
            className="p-1 rounded-md hover:bg-gray-200 text-gray-500"
            title="コンテキストパネルを開く"
            onClick={onOpenContext}
          >
            <Info className="h-5 w-5" />
          </button>

          {/* エクスポートボタン */}
          <button
            className="p-1 rounded-md hover:bg-gray-200 text-gray-500"
            title="エクスポート"
            onClick={onExport}
          >
            <FileText className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* チャットメッセージ一覧 */}
      <MessageList messages={conversation.messages} isTyping={isPending} />

      {/* メッセージ入力エリア */}
      <MessageInput onSendMessage={handleSendMessage} disabled={isPending} />
    </div>
  );
}
