import { Router, type Router as ExpressRouter } from "express";
import { signUpHandler } from "../handlers/authHandlers/signUpHandler";
import { signInHandler } from "../handlers/authHandlers/signInHandler";

const authRouter: ExpressRouter = Router();

authRouter.post("/signup", signUpHandler);
authRouter.post("/signin", signInHandler);

export default authRouter;
