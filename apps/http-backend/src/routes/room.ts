import { Router, type Router as ExpressRouter } from "express";
import { authMiddleware } from "../middlewares/authMiddleware";
import { CreateRoomSchema } from "@repo/common/types";

const roomRouter: ExpressRouter = Router();

roomRouter.post("/create-room", authMiddleware, async (req, res) => {
  const data = CreateRoomSchema.safeParse(req.body);

  if (!data.success) {
    return res.json({
      message: "Incorrect inputs",
    });
  }
});

export default roomRouter;
