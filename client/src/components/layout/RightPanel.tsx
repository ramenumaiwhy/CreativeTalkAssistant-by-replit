import { useState } from "react";
import { useConversation, useUpdateContext, useExportConversation } from "@/hooks/use-conversation";
import { Context, Conversation } from "@/types";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Download, Share2, Clock, MapPin, Smile, Wine } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MindMap from "@/components/mindmap/MindMap";

interface RightPanelProps {
  conversationId: string;
}

export default function RightPanel({ conversationId }: RightPanelProps) {
  const { data: conversation } = useConversation(conversationId);
  // デフォルトコンテキスト - ユーザーがまだコンテキストを設定していない場合に使用
  const defaultContext: Context = {
    time: new Date().toISOString(),
    place: "未設定",
    mood: "普通",
    alcoholLevel: "なし"
  };
  
  // デフォルト会話 - データが取得できない場合のフォールバック
  const defaultConversation: Conversation = {
    id: '',
    title: '',
    context: defaultContext, // 必ずContextを持つように設定
    keyPoints: [],
    messages: [],
    createdAt: '',
    updatedAt: '',
    lastSaved: ''
  };
  // 会話データがない場合はデフォルト値を使用（型アサーションで型安全性を確保）
  const currentConversation = (conversation || defaultConversation) as Conversation;
  const { mutate: updateContext } = useUpdateContext();
  const { mutate: exportConversation, isPending: isExporting } = useExportConversation();
  const { toast } = useToast();
  
  const [isEditingContext, setIsEditingContext] = useState(false);
  const [editedContext, setEditedContext] = useState<Context | null>(null);
  
  const handleOpenContextEditor = () => {
    // 会話がない場合はデフォルトのコンテキストを使用
    const currentContext = conversation?.context || defaultContext;
    
    // 編集用のコンテキストをコピーして設定（必ず有効なコンテキストを使用）
    setEditedContext({ 
      ...currentContext,
      time: currentContext.time || new Date().toISOString(),
      place: currentContext.place || "未設定",
      mood: currentContext.mood || "普通",
      alcoholLevel: currentContext.alcoholLevel || "なし"
    });
    
    setIsEditingContext(true);
  };
  
  const handleSaveContext = () => {
    if (!editedContext) return;
    
    updateContext(
      { conversationId, context: editedContext },
      {
        onSuccess: () => {
          setIsEditingContext(false);
          toast({
            title: "コンテキスト情報を更新しました",
            description: "会話のコンテキスト情報が正常に更新されました。",
          });
        },
        onError: (error) => {
          toast({
            title: "更新エラー",
            description: error.message || "コンテキスト情報を更新できませんでした。",
            variant: "destructive",
          });
        }
      }
    );
  };
  
  const handleExport = () => {
    exportConversation(conversationId, {
      onSuccess: (data) => {
        // Convert markdown to blob and trigger download
        const blob = new Blob([data.markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title || 'conversation'}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({
          title: "エクスポート完了",
          description: "会話をMarkdown形式でエクスポートしました。",
        });
      },
      onError: (error) => {
        toast({
          title: "エクスポートエラー",
          description: error.message || "会話をエクスポートできませんでした。",
          variant: "destructive",
        });
      }
    });
  };
  
  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.origin + '?conversation=' + conversationId)
        .then(() => {
          toast({
            title: "リンクをコピーしました",
            description: "会話へのリンクをクリップボードにコピーしました。",
          });
        })
        .catch(() => {
          toast({
            title: "コピーエラー",
            description: "リンクをコピーできませんでした。",
            variant: "destructive",
          });
        });
    }
  };
  
  const formatTime = (timeStr: string) => {
    try {
      const date = new Date(timeStr);
      return format(date, 'yyyy年MM月dd日 HH:mm', { locale: ja });
    } catch (e) {
      return '不明な日時';
    }
  };
  
  if (!conversation) {
    return (
      <aside className="w-80 bg-white border-l border-gray-200 hidden lg:block flex-shrink-0 overflow-y-auto">
        <div className="p-4 flex justify-center items-center h-full">
          <p className="text-gray-500">会話が読み込まれていません</p>
        </div>
      </aside>
    );
  }
  
  // 正しい型安全性を確保して会話データから必要な情報を抽出
  const { 
    context, 
    keyPoints = [], 
    title = '会話' 
  } = currentConversation;
  
  return (
    <>
      <aside className="w-80 bg-white border-l border-gray-200 hidden lg:block flex-shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-lg text-gray-800 mb-4">コンテキスト情報</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">時間</label>
              <div className="flex items-center text-sm text-gray-800 bg-gray-50 p-2 rounded-md">
                <Clock className="h-4 w-4 text-gray-500 mr-2" />
                {context?.time ? formatTime(context.time) : '未設定'}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">場所</label>
              <div className="flex items-center text-sm text-gray-800 bg-gray-50 p-2 rounded-md">
                <MapPin className="h-4 w-4 text-gray-500 mr-2" />
                {context?.place || '未設定'}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">気分</label>
              <div className="flex items-center text-sm text-gray-800 bg-gray-50 p-2 rounded-md">
                <Smile className="h-4 w-4 text-gray-500 mr-2" />
                {context?.mood || '未設定'}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">アルコールレベル（オプション）</label>
              <div className="flex items-center text-sm text-gray-800 bg-gray-50 p-2 rounded-md">
                <Wine className="h-4 w-4 text-gray-500 mr-2" />
                {context?.alcoholLevel || 'なし'}
              </div>
            </div>
          </div>
          
          <button 
            className="mt-4 w-full py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition"
            onClick={handleOpenContextEditor}
          >
            コンテキスト情報を編集
          </button>
        </div>
        
        <div className="p-4">
          <h2 className="font-semibold text-lg text-gray-800 mb-4">キーポイント</h2>
          
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mb-4">
            <h3 className="font-medium text-sm text-gray-700 mb-2">自動抽出されたキーポイント</h3>
            {keyPoints.length > 0 ? (
              <ul className="text-sm text-gray-800 space-y-2">
                {keyPoints.map((point: string, index: number) => (
                  <li key={index} className="flex items-start">
                    <span className="text-primary-600 font-bold mr-2">•</span>
                    {point}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">会話からキーポイントが抽出されていません</p>
            )}
          </div>
          
          {/* Mind Map Visualization */}
          <div className="border border-gray-200 rounded-md p-3 mb-4">
            <h3 className="font-medium text-sm text-gray-700 mb-2">マインドマップ</h3>
            <div className="bg-white p-2 rounded-md border border-gray-100 h-64 overflow-auto">
              <MindMap keyPoints={keyPoints} title={title} />
            </div>
            <button className="mt-2 w-full py-1.5 px-3 bg-gray-100 rounded-md text-xs text-gray-700 font-medium hover:bg-gray-200 transition">
              拡大表示
            </button>
          </div>
          
          <div className="flex space-x-2">
            <button 
              className="flex-1 py-2 px-4 bg-primary-100 text-primary-700 rounded-md text-sm font-medium hover:bg-primary-200 transition flex items-center justify-center"
              onClick={handleExport}
              disabled={isExporting}
            >
              <Download className="h-4 w-4 mr-1" />
              エクスポート
            </button>
            <button 
              className="flex-1 py-2 px-4 bg-secondary-100 text-secondary-700 rounded-md text-sm font-medium hover:bg-secondary-200 transition flex items-center justify-center"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4 mr-1" />
              共有
            </button>
          </div>
        </div>
      </aside>
      
      <Dialog open={isEditingContext} onOpenChange={setIsEditingContext}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>コンテキスト情報を編集</DialogTitle>
            <DialogDescription>
              会話に関連するコンテキスト情報を更新します
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="place">場所</Label>
              <Input 
                id="place" 
                value={editedContext?.place || ''} 
                onChange={(e) => setEditedContext(prev => prev ? {...prev, place: e.target.value} : null)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="mood">気分</Label>
              <Input 
                id="mood" 
                value={editedContext?.mood || ''} 
                onChange={(e) => setEditedContext(prev => prev ? {...prev, mood: e.target.value} : null)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="alcoholLevel">アルコールレベル</Label>
              <Select 
                value={editedContext?.alcoholLevel || 'なし'} 
                onValueChange={(value) => setEditedContext(prev => prev ? {...prev, alcoholLevel: value} : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="アルコールレベルを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="なし">なし</SelectItem>
                  <SelectItem value="少量">少量</SelectItem>
                  <SelectItem value="中程度">中程度</SelectItem>
                  <SelectItem value="多め">多め</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditingContext(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSaveContext}>
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
