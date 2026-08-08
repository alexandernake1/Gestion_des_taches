import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useWebSocket() {
  const queryClient = useQueryClient();
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    // Use WS for HTTP, WSS for HTTPS
    // For development, we connect to the vite proxy or directly to the backend
    // Since vite might not proxy websockets correctly by default without config,
    // assuming it connects to localhost:8000 directly or via VITE_API_URL
    const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/^http/, 'ws');
    
    const url = `${baseUrl}/ws/notifications/?token=${token}`;

    const connect = () => {
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'notification') {
            // Invalidate notifications query to fetch the new one and update the bell icon
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
          }
        } catch (error) {
          console.error('Error parsing websocket message', error);
        }
      };

      ws.current.onclose = () => {
        console.log('WebSocket disconnected, attempting to reconnect in 3s...');
        setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      if (ws.current) {
        ws.current.onclose = null;
        ws.current.close();
      }
    };
  }, [queryClient]);
}
