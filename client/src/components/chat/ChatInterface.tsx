import { useState, useEffect } from "react";
import { useConversation, useSendMessage } from "@/hooks/use-conversation";
import { useWebSocket } from "@/hooks/use-websocket";
import { Message } from "@/types";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { Loader2, Info, FileText, Wifi, WifiOff, AlertTriangle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

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
  const { data: conversation, isLoading, refetch } = useConversation(conversationId);

  // メッセージを送信するためのフック
  // （新しいメッセージをサーバーに送信する機能です）
  const { mutate: sendMessage, isPending } = useSendMessage();

  // WebSocketを使用するためのフック
  // （リアルタイムでの会話の更新を受信します）
  const { 
    status: wsStatus, 
    lastMessage, 
    isConnecting,
    isSubscribed,
    errorCount,
    diagnostics 
  } = useWebSocket(conversationId);

  // トースト通知を表示するためのフック
  // （画面に通知メッセージを表示する機能です）
  const { toast } = useToast();

  // 自動保存の時間を表示するための状態
  // （「いつ保存されたか」を表示するための変数です）
  const [autoSaveTime, setAutoSaveTime] = useState<string>("たった今");
  
  // 一時的なメッセージ表示用の状態（サーバー応答前に表示するため）
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  
  // AIの応答タイピング中の状態
  const [isAiTyping, setIsAiTyping] = useState(false);

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
   * 一時的なメッセージリストを更新する効果
   * サーバーから最新の会話データが取得されたら、一時メッセージをクリアする
   */
  useEffect(() => {
    if (conversation) {
      setOptimisticMessages([]);
    }
  }, [conversation]);
  
  /**
   * WebSocketからのメッセージを処理する効果
   * 
   * WebSocketから受信したメッセージの種類に応じて、適切な処理を行います。
   * - 新しいメッセージが届いた場合、会話データを再取得
   * - コンテキストが更新された場合、会話データを再取得
   * - メッセージの状態（送信中、応答中など）に応じてUIを更新
   */
  useEffect(() => {
    if (!lastMessage) return;
    
    try {
      const data = lastMessage;
      console.log("WebSocket message received:", data);
      
      // メッセージタイプに応じた処理
      if (data.type === 'update') {
        const updateData = data.data;
        
        // 新しいメッセージを受信した場合
        if (updateData.type === 'new_message') {
          // メッセージの状態に応じた処理
          if (updateData.status === 'user_message_sent') {
            console.log("User message confirmed by server");
          } else if (updateData.status === 'ai_response_complete') {
            console.log("AI response complete, refreshing conversation");
            // タイピング中の状態を解除
            setIsAiTyping(false);
            // 会話データを再取得
            refetch();
          }
        }
        
        // コンテキストが更新された場合
        else if (updateData.type === 'context_updated') {
          console.log("Context updated, refreshing conversation");
          // 会話データを再取得
          refetch();
        }
      }
    } catch (error) {
      console.error("Error processing WebSocket message:", error);
    }
  }, [lastMessage, refetch]);
  
  /**
   * メッセージを送信する関数
   * 
   * ユーザーが入力したメッセージをUIに即時表示し、サーバーに送信します。
   * サーバーからの応答を取得した後、最新の会話を表示します。
   * 送信に失敗した場合は、エラーメッセージを表示します。
   * 
   * @param content - 送信するメッセージの内容
   */
  const handleSendMessage = (content: string) => {
    // 空のメッセージは送信しない
    if (!content.trim()) return;

    // 一時的なユーザーメッセージを作成（即時表示用）
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };

    // UIに即時表示するために一時メッセージに追加
    setOptimisticMessages(prev => [...prev, tempUserMessage]);

    // メッセージを送信
    sendMessage(
      { conversationId, content },
      {
        // エラーが発生した場合の処理
        onError: (error) => {
          // 一時メッセージから失敗したメッセージを削除
          setOptimisticMessages(prev => 
            prev.filter(msg => msg.id !== tempUserMessage.id)
          );
          
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
          {/* WebSocket接続ステータス表示 */}
          <div className="flex items-center mr-2">
            <div 
              className={`h-2 w-2 rounded-full mr-1 ${
                wsStatus === 'open' ? 'bg-green-500' : 
                wsStatus === 'connecting' || wsStatus === 'reconnecting' ? 'bg-yellow-500 animate-pulse' : 
                'bg-red-500'
              }`} 
            />
            <span className="text-xs text-gray-500">
              {wsStatus === 'open' ? '接続済み' : 
               wsStatus === 'connecting' ? '接続中...' : 
               wsStatus === 'reconnecting' ? '再接続中...' : 
               wsStatus === 'error' ? 'エラー' : '切断'
              }
              {errorCount > 0 && ` (${errorCount}回失敗)`}
            </span>
          </div>

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

      {/* チャットメッセージ一覧 - 一時メッセージを含める */}
      <MessageList 
        messages={[...(conversation?.messages || []), ...optimisticMessages]} 
        isTyping={isPending || isAiTyping} 
      />
      
      {/* WebSocket接続状態 */}
      <div className="px-3 py-1 text-xs flex items-center justify-between border-t border-gray-100">
        <div className="flex items-center">
          {wsStatus === 'open' && isSubscribed ? (
            <span className="flex items-center text-green-600">
              <Wifi className="h-3 w-3 mr-1" />
              リアルタイム接続中
              <Badge variant="outline" className="ml-2 text-[9px] px-1 py-0 h-4 bg-green-50">
                購読済み
              </Badge>
            </span>
          ) : wsStatus === 'open' && !isSubscribed ? (
            <span className="flex items-center text-amber-600">
              <Wifi className="h-3 w-3 mr-1" />
              接続中 (購読登録中...)
            </span>
          ) : wsStatus === 'connecting' || wsStatus === 'reconnecting' ? (
            <span className="flex items-center text-amber-600">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              {wsStatus === 'reconnecting' ? '再接続中...' : '接続中...'}
              {diagnostics.reconnectAttempts > 0 && (
                <Badge variant="outline" className="ml-2 text-[9px] px-1 py-0 h-4 bg-amber-50">
                  試行: {diagnostics.reconnectAttempts}/{diagnostics.maxReconnectAttempts}
                </Badge>
              )}
            </span>
          ) : wsStatus === 'error' ? (
            <span className="flex items-center text-red-600">
              <AlertTriangle className="h-3 w-3 mr-1" />
              接続エラー
              {errorCount > 0 && (
                <Badge variant="outline" className="ml-2 text-[9px] px-1 py-0 h-4 bg-red-50">
                  エラー: {errorCount}
                </Badge>
              )}
            </span>
          ) : (
            <span className="flex items-center text-gray-400">
              <WifiOff className="h-3 w-3 mr-1" />
              サーバーと接続されていません
            </span>
          )}
        </div>
        
        {wsStatus === 'error' && (
          <button 
            onClick={() => window.location.reload()}
            className="text-[10px] px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 rounded flex items-center text-gray-700"
            title="ページを再読み込み"
          >
            <RefreshCw className="h-2.5 w-2.5 mr-1" />
            再接続
          </button>
        )}
      </div>
      
      {/* デバッグ用：会話データを確認（常に表示） */}
      <div className="bg-yellow-50 p-2 text-xs border-t border-yellow-200">
        <details>
          <summary className="cursor-pointer">デバッグ情報</summary>
          <p>サーバーメッセージ: {conversation?.messages?.length || 0}</p>
          <p>一時メッセージ: {optimisticMessages.length}</p>
          <p>表示メッセージ合計: {(conversation?.messages?.length || 0) + optimisticMessages.length}</p>
          <p>会話ID: {conversationId}</p>
          <p>会話タイトル: {conversation?.title || '不明'}</p>
          <p>送信中: {isPending ? 'はい' : 'いいえ'}</p>
          <p>WebSocket状態: {wsStatus}</p>
          <p>AI応答タイピング中: {isAiTyping ? 'はい' : 'いいえ'}</p>
          <div className="mt-2 flex space-x-2">
            <button 
              onClick={() => setIsAiTyping(!isAiTyping)}
              className="px-2 py-1 bg-gray-200 rounded text-gray-700 hover:bg-gray-300 text-[10px]"
            >
              {isAiTyping ? 'タイピング停止' : 'タイピング開始'}
            </button>
            <button 
              onClick={() => refetch()}
              className="px-2 py-1 bg-blue-100 rounded text-blue-700 hover:bg-blue-200 text-[10px]"
            >
              会話再取得
            </button>
          </div>
          <p className="mt-1 font-semibold">最後のWebSocketメッセージ:</p>
          <pre className="bg-white p-1 rounded text-[9px] max-h-24 overflow-auto">
            {lastMessage ? JSON.stringify(lastMessage, null, 2) : 'なし'}
          </pre>
          <p className="mt-1 font-semibold">会話メッセージ:</p>
          <pre className="mt-1 bg-white p-1 rounded text-[9px] max-h-24 overflow-auto">
            {JSON.stringify([...(conversation?.messages || []), ...optimisticMessages], null, 2)}
          </pre>
        </details>
      </div>

      {/* メッセージ入力エリア */}
      <MessageInput onSendMessage={handleSendMessage} disabled={isPending} />
    </div>
  );
}
