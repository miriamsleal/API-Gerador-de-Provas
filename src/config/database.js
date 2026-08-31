import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.ts";

const isDevelopment = process.env.NODE_ENV !== "production";
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
  log: isDevelopment ? ["query", "warn", "error"] : ["warn", "error"],
});

export default prisma;