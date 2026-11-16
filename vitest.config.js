import { defineConfig } from "vitest/config";
import { config } from "dotenv";

// A suíte nunca utiliza silenciosamente DATABASE_URL do .env de desenvolvimento.
config({ path: ".env.test", quiet: true });
if (!process.env.TEST_DATABASE_URL) {
  throw new Error(
    "Defina TEST_DATABASE_URL em .env.test apontando para um banco exclusivo de testes.",
  );
}

export default defineConfig({
  test: {
    environment: "node",
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL,
      // ADICIONADO (aula 11): valores exclusivos de teste, sem relação com segredos reais.
      JWT_SECRET: "segredo-somente-para-testes-0123456789abcdef",
      JWT_EXPIRES_IN: "15m",
      // Custo mínimo do bcrypt: os testes medem comportamento, não resistência.
      BCRYPT_SALT_ROUNDS: "4",
      CORS_ORIGINS: "http://localhost:5173",
    },
    fileParallelism: false,
    setupFiles: ["./tests/setup.js"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.js"],
      exclude: ["src/server.js"],
    },
  },
});
