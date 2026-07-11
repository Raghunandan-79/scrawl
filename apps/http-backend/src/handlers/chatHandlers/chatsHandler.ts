import { prismaClient } from "@repo/db/client";
import { Request, Response } from "express";

export const chatsHandler = async (req: Request, res: Response) => {
  const roomId = Number(req.params.roomId);
  if (isNaN(roomId)) {
    return res.status(400).json({
      message: "Invalid room ID",
    });
  }

  const messages = await prismaClient.chat.findMany({
    where: {
      roomId: roomId
    },
    orderBy: {
      id: "desc"
    }
  });

  res.json({
    messages,
  });
};