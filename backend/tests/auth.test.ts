import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { createUserDirectly, registerUser, resetDatabase } from "./helpers.js";

const app = createApp();

beforeEach(async () => {
  await resetDatabase();
});

describe("GET /api/health", () => {
  it("returns service status", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.service).toBe("ecom-backend");
  });
});

describe("POST /api/auth/register", () => {
  it("registers a new user and returns a token", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "New.User@Example.com",
      password: "password123",
      name: "New User",
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toMatchObject({
      email: "new.user@example.com", // normalized to lowercase
      name: "New User",
      role: "CUSTOMER",
    });
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.user.password).toBeUndefined();

    const inDb = await prisma.user.findUnique({ where: { email: "new.user@example.com" } });
    expect(inDb).not.toBeNull();

    // A cart is created automatically.
    const cart = await prisma.cart.findUnique({ where: { userId: res.body.user.id } });
    expect(cart).not.toBeNull();
  });

  it("rejects duplicate email with 409", async () => {
    await registerUser(app, { email: "dup@example.com" });
    const res = await request(app).post("/api/auth/register").send({
      email: "dup@example.com",
      password: "password123",
      name: "Someone Else",
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("rejects weak password with 422", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "weak@example.com",
      password: "short",
      name: "Weak",
    });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("UNPROCESSABLE_ENTITY");
    expect(res.body.error.details.some((d: { field: string }) => d.field === "body.password")).toBe(
      true,
    );
  });

  it("rejects invalid email with 422", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "not-an-email",
      password: "password123",
      name: "Nope",
    });
    expect(res.status).toBe(422);
  });

  it("rejects missing fields with 422", async () => {
    const res = await request(app).post("/api/auth/register").send({ email: "a@b.com" });
    expect(res.status).toBe(422);
    expect(res.body.error.details.length).toBeGreaterThanOrEqual(2);
  });

  it("rejects malformed JSON with 400", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .set("Content-Type", "application/json")
      .send("{not json");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });
});

describe("POST /api/auth/login", () => {
  it("logs in with valid credentials", async () => {
    await registerUser(app, { email: "login@example.com", password: "password123" });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "login@example.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe("login@example.com");
  });

  it("rejects wrong password with 401 and a generic message", async () => {
    await registerUser(app, { email: "login@example.com", password: "password123" });
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "login@example.com", password: "wrong-password" });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe("Invalid email or password");
  });

  it("rejects unknown email with 401 and the same generic message", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ghost@example.com", password: "password123" });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe("Invalid email or password");
  });
});

describe("GET /api/auth/me", () => {
  it("returns the authenticated user", async () => {
    const user = await registerUser(app, { email: "me@example.com" });
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${user.token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: user.id, email: "me@example.com" });
  });

  it("rejects missing token with 401", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects malformed Authorization header with 401", async () => {
    const res = await request(app).get("/api/auth/me").set("Authorization", "Token abc");
    expect(res.status).toBe(401);
  });

  it("rejects a tampered token with 401", async () => {
    const user = await registerUser(app, { email: "tamper@example.com" });
    const forged = `${user.token.slice(0, -3)}aaa`;
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  it("returns 401 when the token subject no longer exists", async () => {
    const user = await registerUser(app, { email: "deleted@example.com" });
    await prisma.user.delete({ where: { id: user.id } });
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${user.token}`);
    expect(res.status).toBe(401);
  });
});

describe("admin role", () => {
  it("grants admin users the ADMIN role", async () => {
    await createUserDirectly({
      email: "admin@example.com",
      password: "password123",
      role: "ADMIN",
    });
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@example.com", password: "password123" });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("ADMIN");
  });
});
