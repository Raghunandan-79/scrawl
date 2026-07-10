import { Router, type Router as ExpressRouter } from "express";
import { authMiddleware } from "../middlewares/authMiddleware";
import { createRoomHandler } from "../handlers/roomHandlers/createRoomHandler";

const roomRouter: ExpressRouter = Router();

roomRouter.post("/create-room", authMiddleware, createRoomHandler);

export default roomRouter;
