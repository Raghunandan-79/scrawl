import { Router, type Router as ExpressRouter } from "express";
import { authMiddleware } from "../middlewares/authMiddleware";
import { createRoomHandler } from "../handlers/roomHandlers/createRoomHandler";
import { joinRoomHadler } from "../handlers/roomHandlers/joinRoomHandler";

const roomRouter: ExpressRouter = Router();

roomRouter.post("/create-room", authMiddleware, createRoomHandler);
roomRouter.post("/:slug", joinRoomHadler);

export default roomRouter;
