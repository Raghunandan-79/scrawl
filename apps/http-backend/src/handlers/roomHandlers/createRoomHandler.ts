import { Request, Response } from "express";
import { CreateRoomSchema } from "@repo/common/types";

export const createRoomHandler = async (req: Request, res: Response) => {
  const data = CreateRoomSchema.safeParse(req.body);

  if (!data.success) {
    return res.json({
      message: "Incorrect inputs",
    });
  }
};
