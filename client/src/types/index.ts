export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export interface Context {
  time: string;
  place: string;
  mood: string;
  alcoholLevel: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  context: Context;
  keyPoints: string[];
  tags?: string[];
  summary?: string;
  createdAt: string;
  updatedAt: string;
  lastSaved: string;
}

export interface ExportData {
  markdown: string;
  conversation: Conversation;
}
