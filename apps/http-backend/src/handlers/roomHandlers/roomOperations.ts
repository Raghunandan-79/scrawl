import { Request, Response } from "express";
import { prismaClient } from "@repo/db/client";

export const getMyRoomsHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const rooms = await prismaClient.room.findMany({
      where: {
        adminId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({ rooms });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteRoomHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const roomId = Number(req.params.roomId);

    if (isNaN(roomId)) {
      return res.status(400).json({ message: "Invalid room ID" });
    }

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Verify user is the admin
    const room = await prismaClient.room.findUnique({
      where: {
        id: roomId,
      },
    });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (room.adminId !== userId) {
      return res
        .status(403)
        .json({ message: "Forbidden: You are not the admin of this room" });
    }

    // Delete associated chats
    await prismaClient.chat.deleteMany({
      where: {
        roomId: roomId,
      },
    });

    // Delete the room
    await prismaClient.room.delete({
      where: {
        id: roomId,
      },
    });

    res.json({ message: "Room deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};
