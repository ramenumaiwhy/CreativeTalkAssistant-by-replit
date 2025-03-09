import { useRef, useEffect } from "react";
import { Message } from "@/types";
import { Loader2 } from "lucide-react";

interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
}

export default function MessageList({ messages, isTyping }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6" id="chat-messages">
      {messages.map((message) => (
        <div 
          key={message.id}
          className={`max-w-3xl mx-auto ${
            message.role === 'user' 
              ? 'flex justify-end animate-fade-in' 
              : 'flex animate-fade-in'
          }`}
        >
          {message.role === 'user' ? (
            <div className="bg-gray-100 rounded-lg p-3 max-w-lg">
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          ) : message.role === 'system' ? (
            <div className="max-w-3xl mx-auto bg-primary-50 rounded-lg p-4 border border-primary-100 animate-fade-in">
              <p className="text-sm text-primary-800 whitespace-pre-wrap">{message.content}</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg p-3 max-w-lg border border-gray-200 shadow-sm">
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          )}
        </div>
      ))}
      
      {isTyping && (
        <div className="max-w-3xl mx-auto flex animate-fade-in">
          <div className="bg-white rounded-lg p-3 max-w-lg border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-2">
              <div className="bg-gray-200 w-2 h-2 rounded-full animate-pulse"></div>
              <div className="bg-gray-200 w-2 h-2 rounded-full animate-pulse delay-150"></div>
              <div className="bg-gray-200 w-2 h-2 rounded-full animate-pulse delay-300"></div>
            </div>
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
}
