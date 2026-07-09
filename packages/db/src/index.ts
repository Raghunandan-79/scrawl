import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({
  path: path.resolve(process.cwd(), "../../packages/db/.env"),
});

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const prismaClient = new PrismaClient({ adapter });
