"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { BACKEND_URL } from "../app/config";
import { useSocket } from "../app/hooks/useSocket";

export function ChatRoomClient({
  id,
}: {
  id: string;
}) {
  const [chats, setChats] = useState<{ message: string }[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const { socket, loading } = useSocket();

  // Fetch initial chat room messages from the API server on mount/room id change
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${BACKEND_URL}/api/v1/chats/${id}`, {
          headers: {
            token: token || "",
          },
        });
        setChats(response.data.messages || []);
      } catch (err) {
        console.error("Failed to load chat history:", err);
      }
    };
    fetchChats();
  }, [id]);

  useEffect(() => {
    if (socket && !loading) {
      socket.send(
        JSON.stringify({
          type: "join_room",
          roomId: id,
        }),
      );

      socket.onmessage = (event) => {
        const parsedData = JSON.parse(event.data);
        if (parsedData.type === "chat") {
          setChats((c) => [...c, { message: parsedData.message }]);
        }
      };
    }
  }, [socket, loading, id]);

  return (
    <div>
      {chats.map((m) => (
        <div>{m.message}</div>
      ))}

      <input
        type="text"
        value={currentMessage}
        onChange={(e) => {
          setCurrentMessage(e.target.value);
        }}
      ></input>
      <button
        onClick={() => {
          socket?.send(
            JSON.stringify({
              type: "chat",
              roomId: id,
              message: currentMessage,
            }),
          );

          setCurrentMessage("");
        }}
      >
        Send message
      </button>
    </div>
  );
}
