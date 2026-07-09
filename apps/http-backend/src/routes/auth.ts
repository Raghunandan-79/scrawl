import { Router, type Router as ExpressRouter } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { JWT_SECRET } from "@repo/backend-common/config";
import { CreateUserSchema, SigninSchema } from "@repo/common/types";
import { prismaClient } from "@repo/db/client";

const authRouter: ExpressRouter = Router();

authRouter.post("/signup", async (req, res) => {
  const data = CreateUserSchema.safeParse(req.body);

  if (!data.success) {
    return res.json({
      message: "Incorrect inputs",
    });
  }

  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;
  const name = req.body.name;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    await prismaClient.user.create({
      data: {
        username: username,
        email: email,
        password: hashedPassword,
        name: name,
      },
    });
  } catch (e) {
    return res.status(400).json({
      message: "Unable to signup",
    });
  }

  res.json({
    message: "You have been signed up successfully",
  });
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
