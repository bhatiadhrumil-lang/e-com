/**
 * Per-worker setup. Runs BEFORE test files are imported.
 * Points the app at the dedicated test database and test JWT secret.
 */
const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://ecom:ecom_secret@localhost:5432/ecom_test?schema=public";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = testDatabaseUrl;
process.env.JWT_SECRET = "test-secret-key-for-vitest-only-0123456789";
process.env.JWT_EXPIRES_IN = "1h";
process.env.CORS_ORIGIN = "http://localhost:5173";
process.env.PORT = "3001";
