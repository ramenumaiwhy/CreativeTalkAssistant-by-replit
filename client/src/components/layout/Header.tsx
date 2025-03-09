import { Settings, Plus } from "lucide-react";
import { useCreateConversation } from "@/hooks/use-conversation";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  onNewConversation: (id: string) => void;
}

export default function Header({ onNewConversation }: HeaderProps) {
  const { mutate: createConversation, isPending } = useCreateConversation();
  const { toast } = useToast();
  
  const handleNewConversation = () => {
    if (isPending) return;
    
    const defaultContext = {
      time: new Date().toISOString(),
      place: "未設定",
      mood: "普通",
      alcoholLevel: "なし"
    };
    
    createConversation(defaultContext, {
      onSuccess: (data) => {
        onNewConversation(data.id);
        toast({
          title: "新しい会話を作成しました",
          description: "コンテキスト情報はいつでも編集できます。",
        });
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
  
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm z-10">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <h1 className="text-xl font-semibold text-gray-800">ConstructiveTalk</h1>
        </div>
        
        <div className="flex items-center space-x-3">
          <button 
            className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition"
            onClick={handleNewConversation}
            disabled={isPending}
          >
            <Plus className="h-6 w-6" />
          </button>
          <button className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition">
            <Settings className="h-6 w-6" />
          </button>
          <div className="relative">
            <button className="flex items-center space-x-1 text-sm font-medium text-gray-700 hover:text-gray-900 p-1 rounded transition">
              <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-medium">
                U
              </div>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
