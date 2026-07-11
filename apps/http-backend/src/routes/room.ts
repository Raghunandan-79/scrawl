import { Router, type Router as ExpressRouter } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { createRoomHandler } from "../handlers/roomHandlers/createRoomHandler.js";
import { joinRoomHadler } from "../handlers/roomHandlers/joinRoomHandler.js";

const roomRouter: ExpressRouter = Router();

roomRouter.post("/create-room", authMiddleware, createRoomHandler);
roomRouter.post("/join-room/:slug", joinRoomHadler);

export default roomRouter;
