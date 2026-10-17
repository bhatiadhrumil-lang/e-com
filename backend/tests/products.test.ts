import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import {
  createProductDirectly,
  createUserDirectly,
  login,
  registerUser,
  resetDatabase,
} from "./helpers.js";

const app = createApp();

beforeEach(async () => {
  await resetDatabase();
});

async function adminToken(): Promise<string> {
  await createUserDirectly({
    email: "admin@example.com",
    password: "password123",
    role: "ADMIN",
  });
  return login(app, "admin@example.com", "password123");
}

describe("GET /api/products", () => {
  it("returns an empty list initially", async () => {
    const res = await request(app).get("/api/products");
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.total).toBe(0);
    expect(res.body.page).toBe(1);
  });

  it("returns active products with pagination metadata", async () => {
    await createProductDirectly({ name: "Alpha", priceCents: 500 });
    await createProductDirectly({ name: "Beta", priceCents: 1500 });
    await createProductDirectly({ name: "Hidden", isActive: false });

    const res = await request(app).get("/api/products");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.items.map((p: { name: string }) => p.name).sort()).toEqual(["Alpha", "Beta"]);
    expect(res.body.items[0].priceCents).toBeTypeOf("number");
  });

  it("filters by category", async () => {
    await createProductDirectly({ name: "Desk", category: "Home Office" });
    await createProductDirectly({ name: "Cable", category: "Accessories" });

    const res = await request(app).get("/api/products").query({ category: "Home Office" });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].name).toBe("Desk");
  });

  it("searches name and description case-insensitively", async () => {
    await createProductDirectly({ name: "Aurora Headphones", description: "noise cancelling" });
    await createProductDirectly({ name: "Desk Lamp", description: "bright LIGHT" });

    const res = await request(app).get("/api/products").query({ search: "light" });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].name).toBe("Desk Lamp");
  });

  it("paginates results", async () => {
    for (let i = 1; i <= 5; i++) {
      await createProductDirectly({ name: `Product ${i}` });
    }
    const res = await request(app).get("/api/products").query({ page: 2, pageSize: 2 });
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.totalPages).toBe(3);
  });

  it("rejects invalid query params with 422", async () => {
    const res = await request(app).get("/api/products").query({ page: 0 });
    expect(res.status).toBe(422);
  });
});

describe("GET /api/products/:id", () => {
  it("returns a product by id", async () => {
    const product = await createProductDirectly({ name: "Widget", priceCents: 2599 });
    const res = await request(app).get(`/api/products/${product.id}`);
    expect(res.status).toBe(200);
    expect(res.body.product).toMatchObject({ id: product.id, name: "Widget", priceCents: 2599 });
  });

  it("returns 404 for a missing product", async () => {
    const res = await request(app).get("/api/products/clxxxxxxxxxxxxxxxxxxxxxxx");
    expect(res.status).toBe(404);
  });

  it("returns 404 for inactive products", async () => {
    const product = await createProductDirectly({ name: "Retired", isActive: false });
    const res = await request(app).get(`/api/products/${product.id}`);
    expect(res.status).toBe(404);
  });

  it("returns 422 for a malformed id", async () => {
    const res = await request(app).get("/api/products/not-a-cuid");
    expect(res.status).toBe(422);
  });
});

describe("POST /api/products (admin)", () => {
  it("requires authentication", async () => {
    const res = await request(app).post("/api/products").send({ name: "X" });
    expect(res.status).toBe(401);
  });

  it("rejects non-admin users with 403", async () => {
    const user = await registerUser(app, { email: "customer@example.com" });
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ name: "X", description: "Y", priceCents: 100, stock: 5 });
    expect(res.status).toBe(403);
  });

  it("creates a product as admin", async () => {
    const token = await adminToken();
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Admin Product",
        description: "Created by admin",
        priceCents: 4999,
        category: "Test",
        stock: 10,
      });

    expect(res.status).toBe(201);
    expect(res.body.product).toMatchObject({ name: "Admin Product", priceCents: 4999 });

    const inDb = await prisma.product.findUnique({ where: { id: res.body.product.id } });
    expect(inDb).not.toBeNull();
  });

  it("validates the payload", async () => {
    const token = await adminToken();
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "", description: "", priceCents: -5 });
    expect(res.status).toBe(422);
  });
});

describe("PATCH /api/products/:id (admin)", () => {
  it("updates product fields", async () => {
    const token = await adminToken();
    const product = await createProductDirectly({ name: "Before", priceCents: 1000 });

    const res = await request(app)
      .patch(`/api/products/${product.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "After", priceCents: 2000, isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.product).toMatchObject({ name: "After", priceCents: 2000, isActive: false });
  });

  it("returns 404 for unknown product", async () => {
    const token = await adminToken();
    const res = await request(app)
      .patch("/api/products/clxxxxxxxxxxxxxxxxxxxxxxx")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Ghost" });
    expect(res.status).toBe(404);
  });
});
