import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { prismaClient } from "@repo/db/client";
import { CreateUserSchema } from "@repo/common/types";

export const signUpHandler = async (req: Request, res: Response) => {
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
        username,
        email,
        password: hashedPassword,
        name,
      },
    });
  } catch (e) {
    return res.status(400).json({
      message: "Unable to signup",
      error: e,
    });
  }

  res.json({
    message: "You have been signed up successfully",
  });
};
