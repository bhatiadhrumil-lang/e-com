/**
 * Global setup for the test suite.
 * Creates the dedicated test database (if missing) and applies migrations.
 */
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, "..");

function resolveTestDatabaseUrl(): string {
  const devUrl = process.env.DATABASE_URL ?? "";
  const replaced = devUrl.replace(/\/ecom([?]|$)/, "/ecom_test$1");
  if (!replaced || replaced === devUrl) {
    return "postgresql://ecom:ecom_secret@localhost:5432/ecom_test?schema=public";
  }
  return replaced;
}

export default function setup(): void {
  process.env.TEST_DATABASE_URL = resolveTestDatabaseUrl();
  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    cwd: backendRoot,
    env: {
      ...process.env,
      DATABASE_URL: process.env.TEST_DATABASE_URL,
      CHECKPOINT_DISABLE: "1",
    },
    stdio: "inherit",
  });
}

