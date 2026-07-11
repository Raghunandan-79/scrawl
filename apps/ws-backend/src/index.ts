import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";
import { prismaClient } from "@repo/db/client";
import { SocketStateManager } from "./StateManager.js";

const wss = new WebSocketServer({ port: 8080 });
const stateManager = SocketStateManager.getInstance();

function checkUser(token: string): string | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (typeof decoded == "string") {
      return null;
    }

    if (!decoded || !decoded.userId) {
      return null;
    }

    return decoded.userId;
  } catch (e) {
    console.error("JWT Verification failed:", e);
    return null;
  }
}

wss.on("connection", function connection(ws, request) {
  const origin = request.headers.origin;
  const ALLOWED_ORIGIN_REGEX = /^(https?:\/\/localhost:3000|https:\/\/.*\.raghunandan\.dev|https:\/\/.*\.onrender\.com)$/;
  if (origin && !ALLOWED_ORIGIN_REGEX.test(origin)) {
    console.warn(`Connection rejected: unauthorized origin: ${origin}`);
    ws.close();
    return;
  }

  const url = request.url;
  if (!url) {
    return;
  }
  const queryParams = new URLSearchParams(url.split("?")[1]);
  const token = queryParams.get("token") || "";
  const userId = checkUser(token);

  if (userId == null) {
    console.warn(`Connection rejected: token length is ${token?.length || 0}`);
    ws.close();
    return;
  }

  // Register active connection
  stateManager.addConnection(ws, userId);

  // Setup disconnect cleanup
  ws.on("close", () => {
    stateManager.removeConnection(ws);
    console.log("WebSocket client disconnected & cleaned up.");
  });

  ws.on("message", async function message(data) {
    let parsedData;
    try {
      if (typeof data !== "string") {
        parsedData = JSON.parse(data.toString());
      } else {
        parsedData = JSON.parse(data);
      }
    } catch (err) {
      console.error("Invalid JSON message received:", err);
      return;
    }

    if (parsedData.type === "join_room") {
      stateManager.joinRoom(ws, parsedData.roomId);
      console.log(`User joined room: ${parsedData.roomId}`);
    }

    if (parsedData.type === "leave_room") {
      stateManager.leaveRoom(ws, parsedData.room);
      console.log(`User left room: ${parsedData.room}`);
    }

    if (parsedData.type === "chat") {
      const roomId = parsedData.roomId;
      const message = parsedData.message;

      try {
        await prismaClient.chat.create({
          data: {
            roomId: Number(roomId),
            message: message,
            userId,
          },
        });

        // Broadcast to all sockets in the same room
        const roomSockets = stateManager.getRoomSockets(roomId);
        roomSockets.forEach((s) => {
          if (s.readyState === WebSocket.OPEN) {
            s.send(
              JSON.stringify({
                type: "chat",
                message: message,
                roomId,
              })
            );
          }
        });
      } catch (err) {
        console.error("Failed to process drawing/chat event:", err);
      }
    }
  });
});

console.log("WebSocket server is running on port 8080");
