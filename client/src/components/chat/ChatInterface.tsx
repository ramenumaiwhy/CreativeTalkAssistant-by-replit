import { useState, useEffect } from "react";
import { useConversation, useSendMessage } from "@/hooks/use-conversation";
import { Message } from "@/types";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { Loader2, Info, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatInterfaceProps {
  conversationId: string;
  onOpenContext: () => void;
  onExport: () => void;
}

export default function ChatInterface({ conversationId, onOpenContext, onExport }: ChatInterfaceProps) {
  const { data: conversation, isLoading } = useConversation(conversationId);
  const { mutate: sendMessage, isPending } = useSendMessage();
  const { toast } = useToast();
  const [autoSaveTime, setAutoSaveTime] = useState<string>("たった今");
  
  useEffect(() => {
    const timer = setInterval(() => {
      if (conversation?.lastSaved) {
        const lastSaved = new Date(conversation.lastSaved);
        const now = new Date();
        const diffMinutes = Math.round((now.getTime() - lastSaved.getTime()) / 60000);
        
        if (diffMinutes < 1) {
          setAutoSaveTime("たった今");
        } else if (diffMinutes === 1) {
          setAutoSaveTime("1分前");
        } else {
          setAutoSaveTime(`${diffMinutes}分前`);
        }
      }
    }, 30000);
    
    return () => clearInterval(timer);
  }, [conversation?.lastSaved]);
  
  const handleSendMessage = (content: string) => {
    if (!content.trim()) return;
    
    sendMessage(
      { conversationId, content },
      {
        onError: (error) => {
          toast({
            title: "メッセージ送信エラー",
            description: error.message || "メッセージを送信できませんでした。",
            variant: "destructive",
          });
        },
      }
    );
  };
  
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
      </div>
    );
  }
  
  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">会話が見つかりませんでした</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Context Bar */}
      <div className="bg-gray-50 border-b border-gray-200 p-3 flex items-center justify-between">
        <div className="flex items-center">
          <button className="md:hidden mr-2 p-1 rounded-md hover:bg-gray-200 text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h2 className="font-medium text-gray-800">{conversation.title}</h2>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">自動保存: {autoSaveTime}</span>
          <button 
            className="p-1 rounded-md hover:bg-gray-200 text-gray-500" 
            title="コンテキストパネルを開く"
            onClick={onOpenContext}
          >
            <Info className="h-5 w-5" />
          </button>
          <button 
            className="p-1 rounded-md hover:bg-gray-200 text-gray-500" 
            title="エクスポート"
            onClick={onExport}
          >
            <FileText className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* Chat Messages */}
      <MessageList messages={conversation.messages} isTyping={isPending} />
      
      {/* Input Area */}
      <MessageInput onSendMessage={handleSendMessage} disabled={isPending} />
    </div>
  );
}
