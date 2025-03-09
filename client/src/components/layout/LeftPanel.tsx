import { useState } from "react";
import { useConversations, useCreateConversation } from "@/hooks/use-conversation";
import { Conversation } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { Plus, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface LeftPanelProps {
  selectedConversationId: string | null;
  onSelectConversation: (conversation: Conversation) => void;
}

export default function LeftPanel({ selectedConversationId, onSelectConversation }: LeftPanelProps) {
  const { data: conversations, isLoading } = useConversations();
  const { mutate: createConversation, isPending: isCreating } = useCreateConversation();
  const { toast } = useToast();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const handleNewConversation = () => {
    if (isCreating) return;
    
    const defaultContext = {
      time: new Date().toISOString(),
      place: "未設定",
      mood: "普通",
      alcoholLevel: "なし"
    };
    
    createConversation(defaultContext, {
      onSuccess: (data) => {
        if (data) {
          onSelectConversation(data);
        }
      },
      onError: (error) => {
        toast({
          title: "会話作成エラー",
          description: error.message || "会話を作成できませんでした。",
          variant: "destructive",
        });
      }
    });
  };
  
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };
  
  const formatTime = (time: string) => {
    try {
      return formatDistanceToNow(new Date(time), { 
        addSuffix: true, 
        locale: ja 
      });
    } catch (e) {
      return "不明な日時";
    }
  };
  
  const allTags = Array.from(
    new Set(
      (conversations || [])
        .flatMap(conv => conv.tags || [])
        .filter(Boolean)
    )
  );
  
  const filteredConversations = selectedTags.length > 0
    ? (conversations || []).filter(conv => 
        selectedTags.every(tag => conv.tags?.includes(tag))
      )
    : conversations || [];
  
  return (
    <aside className="w-72 bg-white border-r border-gray-200 hidden md:block flex-shrink-0 overflow-y-auto">
      <div className="p-4">
        <button 
          className="w-full py-2 px-4 bg-primary-600 text-white rounded-lg flex items-center justify-center font-medium hover:bg-primary-700 transition"
          onClick={handleNewConversation}
          disabled={isCreating}
        >
          <Plus className="h-5 w-5 mr-1" />
          新しい会話
        </button>
      </div>
      
      <div className="px-4 mt-2">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">最近の会話</h2>
          <button className="text-gray-400 hover:text-gray-600">
            <Filter className="h-4 w-4" />
          </button>
        </div>
        
        {isLoading ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
          </div>
        ) : filteredConversations.length > 0 ? (
          filteredConversations.map((conversation) => (
            <div 
              key={conversation.id}
              className={`py-2 px-3 rounded-lg mb-1 border cursor-pointer transition ${
                selectedConversationId === conversation.id 
                  ? 'border-gray-200 bg-gray-50' 
                  : 'border-transparent hover:bg-gray-100 hover:border-gray-200'
              }`}
              onClick={() => onSelectConversation(conversation)}
            >
              <div className="flex items-start justify-between">
                <span className="font-medium text-sm line-clamp-1">{conversation.title}</span>
                <span className="text-xs text-gray-500">{formatTime(conversation.updatedAt)}</span>
              </div>
              {conversation.summary && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{conversation.summary}</p>
              )}
              {conversation.tags && conversation.tags.length > 0 && (
                <div className="flex mt-2 space-x-1 flex-wrap gap-y-1">
                  {conversation.tags.map((tag, index) => (
                    <span 
                      key={index} 
                      className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="py-6 text-center">
            <p className="text-sm text-gray-500">会話はまだありません</p>
          </div>
        )}
      </div>
      
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">保存済みのタグ</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {allTags.map((tag, index) => (
            <span 
              key={index} 
              className={`px-2 py-1 text-xs rounded-full cursor-pointer transition ${
                selectedTags.includes(tag)
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
              }`}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </span>
          ))}
          {allTags.length === 0 && (
            <p className="text-xs text-gray-500 py-2">タグはまだありません</p>
          )}
        </div>
      </div>
    </aside>
  );
}
