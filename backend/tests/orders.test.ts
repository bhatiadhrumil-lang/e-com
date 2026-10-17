import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { createProductDirectly, registerUser, resetDatabase, type TestUser } from "./helpers.js";

const app = createApp();

beforeEach(async () => {
  await resetDatabase();
});

function auth(user: TestUser) {
  return { Authorization: `Bearer ${user.token}` };
}

async function seedCart(
  user: TestUser,
  productId: string,
  quantity: number,
): Promise<void> {
  const res = await request(app)
    .post("/api/cart/items")
    .set(auth(user))
    .send({ productId, quantity });
  if (res.status !== 201) {
    throw new Error(`seedCart failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
}

describe("POST /api/orders", () => {
  it("requires authentication", async () => {
    const res = await request(app).post("/api/orders");
    expect(res.status).toBe(401);
  });

  it("rejects an empty cart with 400", async () => {
    const user = await registerUser(app);
    const res = await request(app).post("/api/orders").set(auth(user));
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("empty cart");
  });

  it("creates an order from the cart, decrements stock, and clears the cart", async () => {
    const user = await registerUser(app);
    const product = await createProductDirectly({ priceCents: 1250, stock: 10 });
    await seedCart(user, product.id, 3);

    const res = await request(app).post("/api/orders").set(auth(user));

    expect(res.status).toBe(201);
    expect(res.body.order).toMatchObject({
      status: "PENDING",
      totalCents: 3750,
      itemCount: 3,
    });
    expect(res.body.order.items).toHaveLength(1);
    expect(res.body.order.items[0]).toMatchObject({
      productName: "Test Product",
      unitPriceCents: 1250,
      quantity: 3,
      lineTotalCents: 3750,
      productId: product.id,
    });

    const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } });
    expect(updatedProduct?.stock).toBe(7);

    const cartItems = await prisma.cartItem.count();
    expect(cartItems).toBe(0);
  });

  it("snapshots product name and price even if the product later changes", async () => {
    const user = await registerUser(app);
    const product = await createProductDirectly({ name: "Original", priceCents: 1000, stock: 5 });
    await seedCart(user, product.id, 1);

    const orderRes = await request(app).post("/api/orders").set(auth(user));
    expect(orderRes.status).toBe(201);

    // Product changes after purchase...
    await prisma.product.update({
      where: { id: product.id },
      data: { name: "Renamed", priceCents: 99999 },
    });

    const orderView = await request(app)
      .get(`/api/orders/${orderRes.body.order.id}`)
      .set(auth(user));

    expect(orderView.status).toBe(200);
    expect(orderView.body.order.items[0].productName).toBe("Original");
    expect(orderView.body.order.items[0].unitPriceCents).toBe(1000);
    expect(orderView.body.order.totalCents).toBe(1000);
  });

  it("rejects orders that would oversell remaining stock", async () => {
    const user = await registerUser(app);
    const product = await createProductDirectly({ stock: 5 });
    await seedCart(user, product.id, 2);

    // Sneak the cart quantity above stock (simulating a race / bad state).
    await prisma.cartItem.updateMany({ data: { quantity: 99 } });

    const res = await request(app).post("/api/orders").set(auth(user));
    expect(res.status).toBe(400);

    // Transaction rolled back: stock untouched, cart intact.
    const unchanged = await prisma.product.findUnique({ where: { id: product.id } });
    expect(unchanged?.stock).toBe(5);
    expect(await prisma.cartItem.count()).toBe(1);
    expect(await prisma.order.count()).toBe(0);
  });

  it("rejects orders containing a deactivated product", async () => {
    const user = await registerUser(app);
    const product = await createProductDirectly({ stock: 5 });
    await seedCart(user, product.id, 1);
    await prisma.product.update({ where: { id: product.id }, data: { isActive: false } });

    const res = await request(app).post("/api/orders").set(auth(user));
    expect(res.status).toBe(400);
  });
});

describe("GET /api/orders", () => {
  it("lists only the current user's orders", async () => {
    const alice = await registerUser(app, { email: "alice@example.com" });
    const bob = await registerUser(app, { email: "bob@example.com" });
    const product = await createProductDirectly({ stock: 10 });

    await seedCart(alice, product.id, 1);
    await request(app).post("/api/orders").set(auth(alice));
    await seedCart(bob, product.id, 2);
    await request(app).post("/api/orders").set(auth(bob));

    const aliceOrders = await request(app).get("/api/orders").set(auth(alice));
    expect(aliceOrders.status).toBe(200);
    expect(aliceOrders.body.total).toBe(1);
    expect(aliceOrders.body.items[0].itemCount).toBe(1);

    const bobOrders = await request(app).get("/api/orders").set(auth(bob));
    expect(bobOrders.body.total).toBe(1);
    expect(bobOrders.body.items[0].itemCount).toBe(2);
  });

  it("requires authentication", async () => {
    const res = await request(app).get("/api/orders");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/orders/:id", () => {
  it("returns an order with its items", async () => {
    const user = await registerUser(app);
    const product = await createProductDirectly({ priceCents: 2000, stock: 5 });
    await seedCart(user, product.id, 2);
    const created = await request(app).post("/api/orders").set(auth(user));

    const res = await request(app)
      .get(`/api/orders/${created.body.order.id}`)
      .set(auth(user));

    expect(res.status).toBe(200);
    expect(res.body.order.id).toBe(created.body.order.id);
    expect(res.body.order.items).toHaveLength(1);
    expect(res.body.order.totalCents).toBe(4000);
  });

  it("hides other users' orders behind 404", async () => {
    const alice = await registerUser(app, { email: "alice@example.com" });
    const mallory = await registerUser(app, { email: "mallory@example.com" });
    const product = await createProductDirectly({ stock: 5 });
    await seedCart(alice, product.id, 1);
    const created = await request(app).post("/api/orders").set(auth(alice));

    const res = await request(app)
      .get(`/api/orders/${created.body.order.id}`)
      .set(auth(mallory));
    expect(res.status).toBe(404);
  });

  it("returns 422 for a malformed order id", async () => {
    const user = await registerUser(app);
    const res = await request(app).get("/api/orders/not-an-id").set(auth(user));
    expect(res.status).toBe(422);
  });
});
