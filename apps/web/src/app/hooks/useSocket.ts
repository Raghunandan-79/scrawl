import { useEffect, useState, useRef } from "react";
import { WS_URL } from "../config";

export function useSocket() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("No token found. Please sign in.");
      setLoading(false);
      return;
    }

    let ws: WebSocket | null = null;
    let pingInterval: NodeJS.Timeout | null = null;

    const connect = () => {
      // Clean up previous socket if it exists
      if (ws) {
        try {
          ws.close();
        } catch (e) {}
      }

      ws = new WebSocket(`${WS_URL}?token=${token}`);

      ws.onopen = () => {
        setSocket(ws);
        setLoading(false);
        setError(null);

        // Start ping heartbeat interval to prevent idle timeouts (every 25 seconds)
        if (pingInterval) clearInterval(pingInterval);
        pingInterval = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 25000);
      };

      ws.onerror = (err) => {
        console.error("WebSocket connection error:", err);
        setError("WebSocket connection failed.");
      };

      ws.onclose = () => {
        setSocket(null);
        if (pingInterval) {
          clearInterval(pingInterval);
          pingInterval = null;
        }

        // Schedule auto-reconnect after 3 seconds
        if (reconnectTimeoutRef.current)
          clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("Attempting WebSocket reconnection...");
          connect();
        }, 3000);
      };
    };

    connect();

    return () => {
      if (pingInterval) clearInterval(pingInterval);
      if (reconnectTimeoutRef.current)
        clearTimeout(reconnectTimeoutRef.current);
      if (ws) {
        // Remove listeners before closing to prevent reconnect loops on unmount
        ws.onopen = null;
        ws.onerror = null;
        ws.onclose = null;
        ws.close();
      }
    };
  }, []);

  return {
    socket,
    loading,
    error,
  };
}
