import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { prismaClient } from "@repo/db/client";
import { CreateUserSchema } from "@repo/common/types";

export const signUpHandler = async (req: Request, res: Response) => {
  const parsedData = CreateUserSchema.safeParse(req.body);

  if (!parsedData.success) {
    return res.json({
      message: "Incorrect inputs",
    });
  }

  try {
    const username = parsedData.data.username;
    const email = parsedData.data.email;
    const password = parsedData.data.password;
    const name = parsedData.data.name;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prismaClient.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        name,
      },
    });

    res.json({
      userId: user.id,
    });
  } catch (e) {
    return res.status(400).json({
      message: "Unable to signup",
    });
  }
};
