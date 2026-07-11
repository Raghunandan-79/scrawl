import { useEffect, useState } from "react";
import { WS_URL } from "../config";

export function useSocket() {
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("No token found. Please sign in.");
      setLoading(false);
      return;
    }

    const ws = new WebSocket(`${WS_URL}?token=${token}`);

    ws.onopen = () => {
      setLoading(false);
      setSocket(ws);
      setError(null);
    };

    ws.onerror = (err) => {
      console.error("WebSocket connection error:", err);
      setError("WebSocket connection failed.");
      setLoading(false);
    };

    ws.onclose = () => {
      setSocket(null);
      setLoading(false);
    };

    return () => {
      ws.close();
    };
  }, []);

  return {
    socket,
    loading,
    error,
  };
}
