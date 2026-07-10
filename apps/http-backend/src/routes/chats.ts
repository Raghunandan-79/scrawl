import { Router, type Router as ExpressRouter } from "express";
import { chatsHandler } from "../handlers/chatHandlers/chatsHandler";
import { authMiddleware } from "../middlewares/authMiddleware";

const chatsRouter: ExpressRouter = Router();

chatsRouter.get("/:roomId", authMiddleware, chatsHandler);

export default chatsRouter;
