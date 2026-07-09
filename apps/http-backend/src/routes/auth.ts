import { Router, type Router as ExpressRouter } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";

const authRouter: ExpressRouter = Router();

authRouter.post("/signup", async (req, res) => {});

authRouter.post("/signin", async (req, res) => {});

export default authRouter;
