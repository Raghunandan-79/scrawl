import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";

const wss = new WebSocketServer({ port: 8080 });

wss.on("connection", (ws, request) => {
  const url = request.url;

  if (!url) {
    return;
  }

  const queryParams = new URLSearchParams(url.split("?")[1]);
  const token = queryParams.get("token");
  const decoded = jwt.verify(token as string, JWT_SECRET);

  if (typeof decoded === "string") {
    ws.close();
    return;
  }

  ws.on("message", (data) => {
    ws.send("pong");
  });
});
