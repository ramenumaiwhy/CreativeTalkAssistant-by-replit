import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Header from "@/components/layout/Header";
import LeftPanel from "@/components/layout/LeftPanel";
import ChatInterface from "@/components/chat/ChatInterface";
import RightPanel from "@/components/layout/RightPanel";
import { useConversations } from "@/hooks/use-conversation";
import { Conversation } from "@/types";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export default function Home() {
  const [location, setLocation] = useLocation();
  const { data: conversations, isLoading } = useConversations();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isContextOpen, setIsContextOpen] = useState(false);
  
  useEffect(() => {
    // Parse conversation ID from URL query param
    const params = new URLSearchParams(window.location.search);
    const conversationId = params.get('conversation');
    
    if (conversationId && conversations) {
      const conversation = conversations.find(c => c.id === conversationId);
      if (conversation) {
        setSelectedConversation(conversation);
      }
    } else if (conversations && conversations.length > 0 && !selectedConversation) {
      // Select the most recent conversation by default
      setSelectedConversation(conversations[0]);
    }
  }, [conversations, location]);
  
  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setLocation(`/?conversation=${conversation.id}`);
  };
  
  const handleNewConversation = (id: string) => {
    setLocation(`/?conversation=${id}`);
  };
  
  const handleExport = () => {
    if (!selectedConversation) return;
    
    // Export functionality will be handled in RightPanel
    // This is just to connect the button in ChatInterface with the RightPanel
  };
  
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header onNewConversation={handleNewConversation} />
      
      <main className="flex flex-1 overflow-hidden">
        <LeftPanel 
          selectedConversationId={selectedConversation?.id || null}
          onSelectConversation={handleSelectConversation}
        />
        
        {selectedConversation ? (
          <ChatInterface 
            conversationId={selectedConversation.id}
            onOpenContext={() => setIsContextOpen(true)}
            onExport={handleExport}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h2 className="text-xl font-medium text-gray-700 mb-2">ConstructiveTalk へようこそ</h2>
              <p className="text-gray-500 max-w-md mx-auto">
                評価懸念のない対話環境での創造性の解放と、アイデアの持続的な発展をサポートします。
                {!isLoading && conversations?.length === 0 && (
                  <span className="block mt-4">
                    左上の「+」ボタンをクリックして、新しい会話を始めましょう。
                  </span>
                )}
              </p>
            </div>
          </div>
        )}
        
        {selectedConversation && <RightPanel conversationId={selectedConversation.id} />}
      </main>
      
      {/* Mobile Context Dialog */}
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
