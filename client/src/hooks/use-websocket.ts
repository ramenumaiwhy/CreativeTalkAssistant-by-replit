import { useEffect, useRef, useState, useCallback } from 'react';

type WebSocketStatus = 'connecting' | 'open' | 'closed' | 'error';

/**
 * WebSocket通信を管理するためのカスタムフック
 * 
 * このフックは、指定した会話IDに対するWebSocket接続を確立し、
 * リアルタイムでの更新を受信します。
 * 
 * @param conversationId 購読する会話のID
 * @returns WebSocketの状態と最後に受信したメッセージ
 */
export function useWebSocket(conversationId: string | undefined) {
  const [status, setStatus] = useState<WebSocketStatus>('closed');
  const [lastMessage, setLastMessage] = useState<any>(null);
  const socketRef = useRef<WebSocket | null>(null);

  // WebSocketが開いているかどうかのフラグ
  const isOpen = status === 'open';

  // 接続を閉じる関数
  const closeConnection = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
      setStatus('closed');
    }
  }, []);

  // WebSocket接続を確立する関数
  const setupWebSocket = useCallback(() => {
    if (!conversationId) return;

    // 既存の接続を閉じる
    closeConnection();

    // WebSocketのURLを構築
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      // WebSocket接続を作成
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;
      setStatus('connecting');

      // 接続が開いたときの処理
      socket.onopen = () => {
        console.log('WebSocket connection established');
        setStatus('open');

        // 会話の購読をリクエスト
        socket.send(JSON.stringify({
          type: 'subscribe',
          conversationId
        }));
      };

      // メッセージを受信したときの処理
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
          setLastMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      // エラーが発生したときの処理
      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStatus('error');
      };

      // 接続が閉じられたときの処理
      socket.onclose = () => {
        console.log('WebSocket connection closed');
        setStatus('closed');
      };
    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error);
      setStatus('error');
    }
  }, [conversationId, closeConnection]);

  // 会話IDが変更されたときにWebSocket接続を再確立
  useEffect(() => {
    setupWebSocket();

    // コンポーネントがアンマウントされたときに接続を閉じる
    return () => {
      closeConnection();
    };
  }, [conversationId, setupWebSocket, closeConnection]);

  return { status, isOpen, lastMessage };
}