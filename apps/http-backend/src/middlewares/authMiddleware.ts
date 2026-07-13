import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const header = req.headers["token"] as string;
  const decoded = jwt.verify(header, JWT_SECRET);

  if (typeof decoded === "string") {
    return res.status(400).json({
      message: "Unauthorized",
    });
  }

  if (decoded.userId) {
    req.userId = decoded.userId;
    next();
  } else {
    res.status(403).json({
      message: "Unauthorized",
    });
  }
}
