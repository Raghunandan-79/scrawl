import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";
import { prismaClient } from "@repo/db/client";
import { SocketStateManager } from "./StateManager.js";

const PORT = Number(process.env.PORT) || 8080;

const server = createServer((req, res) => {
  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "healthy" }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

const wss = new WebSocketServer({ server });
const stateManager = SocketStateManager.getInstance();

server.listen(PORT, () => {
  console.log(`ws-backend listening on ${PORT}`);
});

// Self-ping keeping Render Free Tier awake
const selfUrl = process.env.RENDER_EXTERNAL_URL;
if (selfUrl) {
  console.log(`Self-ping keep-alive registered for: ${selfUrl}`);
  setInterval(() => {
    fetch(selfUrl)
      .then((res) => console.log(`Self-ping successful: status ${res.status}`))
      .catch((err) => console.error("Self-ping failed:", err));
  }, 10 * 60 * 1000); // every 10 minutes
}

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

wss.on("connection", async function connection(ws, request) {
  const origin = request.headers.origin;
  const ALLOWED_ORIGINS = [
    "http://localhost:3000",
    ...(process.env.ALLOWED_ORIGINS?.split(",") ?? []),
  ];
  const isAllowed =
    !origin ||
    origin === "http://localhost:3000" ||
    origin.endsWith(".raghunandan.dev") ||
    ALLOWED_ORIGINS.includes(origin);

  if (!isAllowed) {
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

  let userName = "Collaborator";
  try {
    const user = await prismaClient.user.findUnique({
      where: { id: userId },
      select: { name: true, username: true },
    });
    if (user) {
      userName = user.name || user.username;
    }
  } catch (err) {
    console.error("Failed to fetch user name:", err);
  }

  // Register active connection
  stateManager.addConnection(ws, userId, userName);

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

    if (parsedData.type === "cursor_move") {
      const roomId = parsedData.roomId;
      const x = parsedData.x;
      const y = parsedData.y;
      const connInfo = stateManager.getConnectionInfo(ws);
      if (connInfo) {
        const roomSockets = stateManager.getRoomSockets(roomId);
        roomSockets.forEach((s) => {
          if (s !== ws && s.readyState === WebSocket.OPEN) {
            s.send(
              JSON.stringify({
                type: "cursor_move",
                userId: connInfo.userId,
                userName: connInfo.userName,
                x,
                y,
                roomId,
              })
            );
          }
        });
      }
    }

    if (parsedData.type === "chat") {
      const roomId = parsedData.roomId;
      const message = parsedData.message;

      // 1. Broadcast immediately to all sockets in the same room for zero latency
      try {
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
      } catch (broadcastErr) {
        console.error("Failed to broadcast chat event:", broadcastErr);
      }

      // 2. Persist to database asynchronously in the background
      prismaClient.chat.create({
        data: {
          roomId: Number(roomId),
          message: message,
          userId,
        },
      }).catch((dbErr) => {
        console.error("Failed to save drawing/chat event to DB:", dbErr);
      });
    }
  });
});

console.log("WebSocket server is running on port 8080");
