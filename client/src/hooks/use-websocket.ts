import { useEffect, useRef, useState, useCallback } from 'react';

type WebSocketStatus = 'connecting' | 'open' | 'closed' | 'error' | 'reconnecting';
type WebSocketMessage = {
  type: string;
  [key: string]: any;
};

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_INTERVAL = 3000; // ミリ秒

/**
 * WebSocket通信を管理するためのカスタムフック
 * 
 * このフックは、指定した会話IDに対するWebSocket接続を確立し、
 * リアルタイムでの更新を受信します。自動再接続やエラー処理も実装しています。
 * 
 * @param conversationId 購読する会話のID
 * @returns WebSocketの状態、最後に受信したメッセージ、接続ステータス情報
 */
export function useWebSocket(conversationId: string | undefined) {
  const [status, setStatus] = useState<WebSocketStatus>('closed');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [errorCount, setErrorCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocketが開いているかどうかのフラグ
  const isOpen = status === 'open';
  // 接続中または再接続中かどうかのフラグ
  const isConnecting = status === 'connecting' || status === 'reconnecting';

  // デバッグログ出力関数
  const logDebug = useCallback((message: string, data?: any) => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[WebSocket ${timestamp}]`;
    if (data) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }, []);

  // エラーログ出力関数
  const logError = useCallback((message: string, error?: any) => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[WebSocket ERROR ${timestamp}]`;
    if (error) {
      console.error(`${prefix} ${message}`, error);
    } else {
      console.error(`${prefix} ${message}`);
    }
  }, []);

  // 再接続タイムアウトをクリアする関数
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // 接続を閉じる関数
  const closeConnection = useCallback(() => {
    clearReconnectTimeout();
    
    if (socketRef.current) {
      try {
        logDebug('Closing connection');
        socketRef.current.close();
      } catch (error) {
        logError('Error closing WebSocket connection', error);
      }
      socketRef.current = null;
    }
    
    setStatus('closed');
    setIsSubscribed(false);
    reconnectAttempts.current = 0;
  }, [logDebug, logError, clearReconnectTimeout]);

  // 会話を購読する関数
  const subscribeToConversation = useCallback((socket: WebSocket, id: string) => {
    try {
      logDebug(`Subscribing to conversation: ${id}`);
      socket.send(JSON.stringify({
        type: 'subscribe',
        conversationId: id,
        clientInfo: {
          userAgent: navigator.userAgent,
          time: new Date().toISOString()
        }
      }));
    } catch (error) {
      logError('Error subscribing to conversation', error);
      setStatus('error');
    }
  }, [logDebug, logError]);

  // 再接続処理を実行する関数
  const attemptReconnect = useCallback(() => {
    if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
      logError(`Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Giving up.`);
      setStatus('error');
      return;
    }

    reconnectAttempts.current += 1;
    setStatus('reconnecting');
    logDebug(`Attempting to reconnect (${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS})...`);
    
    // 一定時間後に再接続
    clearReconnectTimeout();
    reconnectTimeoutRef.current = setTimeout(() => {
      setupWebSocket();
    }, RECONNECT_INTERVAL);
  }, [logDebug, logError, clearReconnectTimeout]);

  // WebSocket接続を確立する関数
  const setupWebSocket = useCallback(() => {
    if (!conversationId) {
      logDebug('No conversation ID provided. WebSocket will not connect.');
      return;
    }

    // 既存の接続を閉じる
    if (socketRef.current) {
      closeConnection();
    }

    // WebSocketのURLを構築
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    logDebug(`Connecting to WebSocket URL: ${wsUrl} for conversation: ${conversationId}`);

    try {
      // WebSocket接続を作成
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;
      setStatus('connecting');

      // 接続が開いたときの処理
      socket.onopen = () => {
        logDebug('WebSocket connection established successfully');
        setStatus('open');
        setErrorCount(0);
        reconnectAttempts.current = 0;

        // 会話の購読をリクエスト
        subscribeToConversation(socket, conversationId);
      };

      // メッセージを受信したときの処理
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          logDebug('WebSocket message received:', data);
          
          // 特定のメッセージタイプによる処理
          if (data.type === 'subscribed') {
            setIsSubscribed(true);
            logDebug(`Successfully subscribed to conversation: ${data.conversationId}`);
          }
          
          setLastMessage(data);
        } catch (error) {
          logError('Error parsing WebSocket message:', error);
        }
      };

      // エラーが発生したときの処理
      socket.onerror = (error) => {
        logError('WebSocket error occurred:', error);
        setStatus('error');
        setErrorCount(prev => prev + 1);
      };

      // 接続が閉じられたときの処理
      socket.onclose = (event) => {
        setIsSubscribed(false);
        if (event.wasClean) {
          logDebug(`WebSocket connection closed cleanly, code=${event.code}, reason=${event.reason}`);
          setStatus('closed');
        } else {
          logError(`WebSocket connection abruptly closed, code=${event.code}`);
          setStatus('error');
          
          // 特定のエラーコードでないか、強制終了でない場合は再接続を試みる
          if (event.code !== 1000 && event.code !== 1001) {
            attemptReconnect();
          }
        }
      };
    } catch (error) {
      logError('Failed to establish WebSocket connection:', error);
      setStatus('error');
      // 接続試行後のエラーでも再接続を試みる
      attemptReconnect();
    }
  }, [conversationId, closeConnection, subscribeToConversation, attemptReconnect, logDebug, logError]);

  // 会話IDが変更されたときにWebSocket接続を再確立
  useEffect(() => {
    logDebug(`Conversation ID changed to: ${conversationId || 'undefined'}`);
    setupWebSocket();

    // コンポーネントがアンマウントされたときに接続を閉じる
    return () => {
      logDebug('Component unmounting, closing WebSocket connection');
      closeConnection();
    };
  }, [conversationId, setupWebSocket, closeConnection, logDebug]);

  return { 
    status, 
    isOpen, 
    isConnecting,
    isSubscribed,
    errorCount,
    lastMessage,
    // 診断情報
    diagnostics: {
      reconnectAttempts: reconnectAttempts.current,
      maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS
    }
  };
}