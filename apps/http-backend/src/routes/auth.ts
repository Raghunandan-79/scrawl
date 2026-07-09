import { Router, type Router as ExpressRouter } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";
import { CreateUserSchema, SigninSchema } from "@repo/common/types";

const authRouter: ExpressRouter = Router();

authRouter.post("/signup", async (req, res) => {
  const data = CreateUserSchema.safeParse(req.body);

  if (!data.success) {
    return res.json({
      message: "Incorrect inputs",
    });
  }
});

authRouter.post("/signin", async (req, res) => {
  const data = SigninSchema.safeParse(req.body);

  if (!data.success) {
    return res.json({
      message: "Incorrect inputs",
    });
  }
});

export default authRouter;
