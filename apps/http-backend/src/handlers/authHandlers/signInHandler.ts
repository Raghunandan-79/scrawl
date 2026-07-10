import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { prismaClient } from "@repo/db/client";
import { SigninSchema } from "@repo/common/types";
import { JWT_SECRET } from "@repo/backend-common/config";
import jwt from "jsonwebtoken";

export const signInHandler = async (req: Request, res: Response) => {
  const parsedData = SigninSchema.safeParse(req.body);

  if (!parsedData.success) {
    return res.json({
      message: "Incorrect inputs",
    });
  }

  try {
    const username = parsedData.data?.username;
    const password = parsedData.data.password;
    const user = await prismaClient.user.findUnique({
      where: {
        username
      },
    });

    if (!user) {
      return res.status(400).json({
        message: "User doesnot exists",
      });
    }

    const passwordMatched = await bcrypt.compare(password, user.password);

    if (passwordMatched) {
      const token = jwt.sign(
        {
          id: user.id.toString(),
        },
        JWT_SECRET,
      );

      res.json({
        token: token,
      });
    } else {
      res.status(403).json({
        message: "Incorrect credentials",
      });
    }
  } catch (e) {
    return res.status(400).json({
      message: "User doesnot exits",
    });
  }
};
