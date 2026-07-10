import { Request, Response } from "express";
import { CreateRoomSchema } from "@repo/common/types";
import { prismaClient } from "@repo/db/client";

export const createRoomHandler = async (req: Request, res: Response) => {
  const parsedData = CreateRoomSchema.safeParse(req.body);

  if (!parsedData.success) {
    return res.json({
      message: "Incorrect inputs",
    });
  }

  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  try {
    await prismaClient.room.create({
      data: {
        slug: parsedData.data.name,
        adminId: userId,
      },
    });

    res.json({
      roomId: 123
    })
  } catch(e) {
    return res.status(500).json({
      messsage: "Unable to create room"
    })
  }
};
