import { Router, type Router as ExpressRouter } from "express";
import { authMiddleware } from "../middlewares/authMiddleware";

const roomRouter: ExpressRouter = Router();

roomRouter.post("/create-room", authMiddleware, async (req, res) => {

});

export default roomRouter;