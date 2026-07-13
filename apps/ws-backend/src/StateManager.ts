import { WebSocket } from "ws";

interface UserConnection {
  userId: string;
  userName: string;
  rooms: Set<string>;
}

export class SocketStateManager {
  private static instance: SocketStateManager;

  // Maps ws connection to user info
  private connections = new Map<WebSocket, UserConnection>();

  // Maps roomId to set of active WebSockets in that room
  private rooms = new Map<string, Set<WebSocket>>();

  private constructor() {}

  public static getInstance(): SocketStateManager {
    if (!SocketStateManager.instance) {
      SocketStateManager.instance = new SocketStateManager();
    }
    return SocketStateManager.instance;
  }

  public addConnection(ws: WebSocket, userId: string, userName: string) {
    this.connections.set(ws, {
      userId,
      userName,
      rooms: new Set(),
    });
  }

  public removeConnection(ws: WebSocket) {
    const conn = this.connections.get(ws);
    if (!conn) return;

    // Remove user from all rooms they joined
    conn.rooms.forEach((roomId) => {
      const roomSockets = this.rooms.get(roomId);
      if (roomSockets) {
        roomSockets.delete(ws);
        if (roomSockets.size === 0) {
          this.rooms.delete(roomId);
        }
      }
    });

    this.connections.delete(ws);
  }

  public joinRoom(ws: WebSocket, roomId: string) {
    const conn = this.connections.get(ws);
    if (!conn) return;

    conn.rooms.add(roomId);

    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId)!.add(ws);
  }

  public leaveRoom(ws: WebSocket, roomId: string) {
    const conn = this.connections.get(ws);
    if (!conn) return;

    conn.rooms.delete(roomId);

    const roomSockets = this.rooms.get(roomId);
    if (roomSockets) {
      roomSockets.delete(ws);
      if (roomSockets.size === 0) {
        this.rooms.delete(roomId);
      }
    }
  }

  public getRoomSockets(roomId: string): Set<WebSocket> {
    return this.rooms.get(roomId) || new Set();
  }

  public getConnectionInfo(ws: WebSocket) {
    return this.connections.get(ws);
  }
}
