import { Router, type Router as ExpressRouter } from "express";
import { chatsHandler } from "../handlers/chatHandlers/chatsHandler.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const chatsRouter: ExpressRouter = Router();

chatsRouter.get("/get-chats/:roomId", authMiddleware, chatsHandler);

export default chatsRouter;
