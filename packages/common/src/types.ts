import { z } from "zod";

export const CreateUserSchema = z
  .object({
    username: z.string().min(3).max(20),
    email: z.string().trim().email().toLowerCase(),
    password: z.string().min(4).max(30),
    name: z.string().min(3).max(50),
  })
  .strict();

export const SigninSchema = z
  .object({
    username: z.string().min(3).max(20),
    password: z.string().min(4).max(30),
  })
  .strict();

export const CreateRoomSchema = z
  .object({
    name: z.string().min(3).max(20),
  })
  .strict();
