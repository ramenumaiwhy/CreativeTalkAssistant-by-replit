import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Conversation, Message, Context } from "@/types";

export function useConversations() {
  return useQuery<Conversation[]>({
    queryKey: ['/api/conversations'],
    refetchInterval: 3000, // 3秒ごとに自動でデータを再取得
    refetchOnMount: true,  // コンポーネントがマウントされた時に再取得
  });
}

export function useConversation(id?: string) {
  const fetchConversation = async ({ queryKey }: any) => {
    const [_, conversationId] = queryKey;
    console.log("Individual conversation fetch - Fetching ID:", conversationId);
    
    if (!conversationId) {
      console.log("No conversation ID provided");
      return null;
    }
    
    const response = await fetch(`/api/conversations/${conversationId}`);
    if (!response.ok) {
      throw new Error('会話の取得に失敗しました');
    }
    
    const data = await response.json();
    console.log("個別会話データ:", data);
    console.log("メッセージ数:", data.messages?.length || 0);
    return data;
  };

  return useQuery<Conversation>({
    queryKey: ['/api/conversations', id],
    queryFn: fetchConversation,
    enabled: !!id,
    refetchInterval: 3000, // 3秒ごとに自動でデータを再取得
    refetchOnMount: true,  // コンポーネントがマウントされた時に再取得
    staleTime: 0,  // 常に最新データを取得する
  });
}

export function useCreateConversation() {
  const mutation = useMutation({
    mutationFn: async (context: Context) => {
      const res = await apiRequest('POST', '/api/conversations', { context });
      const data = await res.json();
      console.log('Created conversation:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('Successfully created conversation, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    },
    onError: (error) => {
      console.error('Error creating conversation:', error);
    }
  });
  
  return mutation;
}

export function useSendMessage() {
  const mutation = useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string, content: string }) => {
      const res = await apiRequest('POST', `/api/conversations/${conversationId}/messages`, { content });
      return await res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', variables.conversationId] });
    },
  });
  
  return mutation;
}

export function useUpdateContext() {
  const mutation = useMutation({
    mutationFn: async ({ conversationId, context }: { conversationId: string, context: Context }) => {
      // contextオブジェクトが適切な形式で送信されるようにする
      // timeフィールドがない場合は現在時刻を追加
      const updatedContext = {
        ...context,
        time: context.time || new Date().toISOString()
      };
      
      const res = await apiRequest('PATCH', `/api/conversations/${conversationId}/context`, updatedContext);
      return await res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', variables.conversationId] });
    },
  });
  
  return mutation;
}

export function useExportConversation() {
  const mutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const res = await apiRequest('GET', `/api/conversations/${conversationId}/export`);
      return await res.json();
    },
  });
  
  return mutation;
}
