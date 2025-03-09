import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Conversation, Message, Context } from "@/types";

export function useConversations() {
  return useQuery({
    queryKey: ['/api/conversations'],
  });
}

export function useConversation(id?: string) {
  return useQuery({
    queryKey: ['/api/conversations', id],
    enabled: !!id,
  });
}

export function useCreateConversation() {
  const mutation = useMutation({
    mutationFn: async (context: Context) => {
      const res = await apiRequest('POST', '/api/conversations', { context });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    },
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
