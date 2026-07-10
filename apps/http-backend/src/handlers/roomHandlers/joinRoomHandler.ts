import { prismaClient } from "@repo/db/client";
import { Request, Response } from "express";

export const joinRoomHadler = async (req: Request, res: Response) => {
  const slug = req.params.slug;
  if (typeof slug !== "string") {
    return;
  }

  const room = await prismaClient.room.findUnique({
    where: {
      slug,
    },
  });

  res.json({
    room,
  });
};
