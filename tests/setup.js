// tests/setup.js
import { afterAll } from "vitest";
import prisma from "../src/config/database.js";

afterAll(async () => {
  await prisma.$disconnect();
});