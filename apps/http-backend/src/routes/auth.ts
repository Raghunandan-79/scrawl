import { Router, type Router as ExpressRouter } from "express";

const authRouter: ExpressRouter = Router();

authRouter.post("/signup", async (req, res) => {});

authRouter.post("/signin", async (req, res) => {});

export default authRouter;
