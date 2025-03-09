import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Header from "@/components/layout/Header";
import LeftPanel from "@/components/layout/LeftPanel";
import ChatInterface from "@/components/chat/ChatInterface";
import RightPanel from "@/components/layout/RightPanel";
import { useConversations } from "@/hooks/use-conversation";
import { Conversation } from "@/types";
import { Dialog, DialogContent } from "@/components/ui/dialog";

/**
 * ホームページコンポーネント
 * 
 * このコンポーネントはアプリのメインページを表示します。
 * 画面は以下の部分から構成されています：
 * 
 * 1. ヘッダー（上部）：アプリのタイトルや新規会話ボタンを表示
 * 2. 左パネル：会話の一覧を表示
 * 3. 中央部分：選択された会話のチャットインターフェース
 * 4. 右パネル：会話のコンテキスト情報やマインドマップを表示
 * 
 * このコンポーネントは「部屋の間取り」のようなもので、
 * 各部品（ヘッダー、パネル、チャットなど）をどのように配置するかを決めています。
 */
export default function Home() {
  // URLの情報を取得・変更するためのフック
  // （「今どのページにいるか」を知るための機能です）
  const [location, setLocation] = useLocation();

  // 会話データを取得するためのフック
  // （「会話の一覧」を取得する機能です）
  const { data: conversations, isLoading } = useConversations();

  // 現在選択されている会話を保存するための状態
  // （「今どの会話を見ているか」を記憶する変数です）
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  // コンテキストパネルの表示状態を管理するための状態
  // （スマホなどの小さい画面で「コンテキスト情報」を表示するかどうかを管理します）
  const [isContextOpen, setIsContextOpen] = useState(false);

  /**
   * URLから会話IDを取得し、該当する会話を選択する効果
   * 
   * useEffectは「副作用」と呼ばれる処理を行うためのフックです。
   * 「副作用」とは、データの取得やURLの変更など、コンポーネントの表示以外の処理のことです。
   * 
   * ここでは以下のことを行っています：
   * 1. URLから会話IDを取得する
   * 2. そのIDに一致する会話があれば、それを選択する
   * 3. URLに会話IDがなく、会話一覧がある場合は最初の会話を選択する
   */
  useEffect(() => {
    // URLからクエリパラメータを取得（例：?conversation=123 の「123」部分）
    const params = new URLSearchParams(window.location.search);
    const conversationId = params.get('conversation');

    if (conversationId && conversations) {
      // 指定されたIDの会話を探す
      const conversation = conversations.find(c => c.id === conversationId);
      if (conversation) {
        // 見つかった会話を選択状態にする
        setSelectedConversation(conversation);
      }
    } else if (conversations && conversations.length > 0 && !selectedConversation) {
      // 会話IDが指定されていない場合は、最新の会話を選択する
      setSelectedConversation(conversations[0]);
    }
  }, [conversations, location]); // 会話一覧またはURLが変わったときに実行

  /**
   * 会話を選択したときの処理
   * 
   * 左パネルで会話をクリックしたときに呼び出される関数です。
   * 選択された会話を現在の会話として設定し、URLも更新します。
   * 
   * @param conversation 選択された会話
   */
  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setLocation(`/?conversation=${conversation.id}`);
  };

  /**
   * 新しい会話を作成したときの処理
   * 
   * 新しい会話が作成されたときに呼び出される関数です。
   * 作成された会話のIDをURLに設定します。
   * 
   * @param id 新しく作成された会話のID
   */
  const handleNewConversation = (id: string) => {
    setLocation(`/?conversation=${id}`);
  };

  /**
   * エクスポートボタンがクリックされたときの処理
   * 
   * 会話をエクスポート（外部に保存できる形式に変換）するための関数です。
   * 実際のエクスポート処理はRightPanelコンポーネントで行われます。
   */
  const handleExport = () => {
    if (!selectedConversation) return;

    // エクスポート機能は右パネルで処理されます
    // ここではボタンのクリックイベントを処理するだけです
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* ヘッダー部分 */}
      <Header onNewConversation={handleNewConversation} />

      {/* メインコンテンツ部分 */}
      <main className="flex flex-1 overflow-hidden">
        {/* 左側のパネル（会話一覧） */}
        <LeftPanel
          selectedConversationId={selectedConversation?.id || null}
          onSelectConversation={handleSelectConversation}
        />

        {/* 中央部分（チャットインターフェースまたはウェルカムメッセージ） */}
        {selectedConversation ? (
          // 会話が選択されている場合はチャットインターフェースを表示
          <ChatInterface
            conversationId={selectedConversation.id}
            onOpenContext={() => setIsContextOpen(true)}
            onExport={handleExport}
          />
        ) : (
          // 会話が選択されていない場合はウェルカムメッセージを表示
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h2 className="text-xl font-medium text-gray-700 mb-2">ConstructiveTalk へようこそ</h2>
              <p className="text-gray-500 max-w-md mx-auto">
                評価懸念のない対話環境での創造性の解放と、アイデアの持続的な発展をサポートします。
                {!isLoading && conversations?.length === 0 && (
                  // 会話がまだない場合は、新しい会話を始めるよう促すメッセージを表示
                  <span className="block mt-4">
                    左上の「+」ボタンをクリックして、新しい会話を始めましょう。
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* 右側のパネル（コンテキスト情報、マインドマップなど） */}
        {selectedConversation && <RightPanel conversationId={selectedConversation.id} />}
      </main>

      {/* モバイル用のコンテキストダイアログ（小さい画面用） */}
      {selectedConversation && (
        <Dialog open={isContextOpen} onOpenChange={setIsContextOpen}>
          <DialogContent className="sm:max-w-md">
            <RightPanel conversationId={selectedConversation.id} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
