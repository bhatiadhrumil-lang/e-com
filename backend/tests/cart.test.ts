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

describe("GET /api/cart", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/cart");
    expect(res.status).toBe(401);
  });

  it("returns an empty cart for a new user", async () => {
    const user = await registerUser(app);
    const res = await request(app).get("/api/cart").set(auth(user));

    expect(res.status).toBe(200);
    expect(res.body.cart.items).toEqual([]);
    expect(res.body.cart.totalCents).toBe(0);
    expect(res.body.cart.itemCount).toBe(0);
  });

  it("returns only the requesting user's cart", async () => {
    const alice = await registerUser(app, { email: "alice@example.com" });
    const bob = await registerUser(app, { email: "bob@example.com" });
    const product = await createProductDirectly({ priceCents: 1000 });

    await request(app)
      .post("/api/cart/items")
      .set(auth(alice))
      .send({ productId: product.id, quantity: 2 });

    const bobCart = await request(app).get("/api/cart").set(auth(bob));
    expect(bobCart.status).toBe(200);
    expect(bobCart.body.cart.items).toEqual([]);
    expect(bobCart.body.cart.totalCents).toBe(0);
  });
});

describe("POST /api/cart/items", () => {
  it("adds an item and computes totals", async () => {
    const user = await registerUser(app);
    const product = await createProductDirectly({ priceCents: 2500, stock: 10 });

    const res = await request(app)
      .post("/api/cart/items")
      .set(auth(user))
      .send({ productId: product.id, quantity: 2 });

    expect(res.status).toBe(201);
    expect(res.body.cart.items).toHaveLength(1);
    expect(res.body.cart.items[0]).toMatchObject({ quantity: 2, subtotalCents: 5000 });
    expect(res.body.cart.items[0].product.id).toBe(product.id);
    expect(res.body.cart.totalCents).toBe(5000);
    expect(res.body.cart.itemCount).toBe(2);
  });

  it("increments quantity when the product is already in the cart", async () => {
    const user = await registerUser(app);
    const product = await createProductDirectly({ priceCents: 1000, stock: 10 });

    await request(app).post("/api/cart/items").set(auth(user)).send({ productId: product.id, quantity: 2 });
    const res = await request(app)
      .post("/api/cart/items")
      .set(auth(user))
      .send({ productId: product.id, quantity: 3 });

    expect(res.status).toBe(201);
    expect(res.body.cart.items).toHaveLength(1);
    expect(res.body.cart.items[0].quantity).toBe(5);
    expect(res.body.cart.totalCents).toBe(5000);
  });

  it("rejects quantities beyond available stock with 400", async () => {
    const user = await registerUser(app);
    const product = await createProductDirectly({ stock: 2 });

    const res = await request(app)
      .post("/api/cart/items")
      .set(auth(user))
      .send({ productId: product.id, quantity: 5 });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("stock");
  });

  it("returns 404 for an unknown product", async () => {
    const user = await registerUser(app);
    const res = await request(app)
      .post("/api/cart/items")
      .set(auth(user))
      .send({ productId: "clxxxxxxxxxxxxxxxxxxxxxxx", quantity: 1 });
    expect(res.status).toBe(404);
  });

  it("returns 404 for an inactive product", async () => {
    const user = await registerUser(app);
    const product = await createProductDirectly({ isActive: false });
    const res = await request(app)
      .post("/api/cart/items")
      .set(auth(user))
      .send({ productId: product.id, quantity: 1 });
    expect(res.status).toBe(404);
  });

  it("validates quantity bounds with 422", async () => {
    const user = await registerUser(app);
    const product = await createProductDirectly();

    const zero = await request(app)
      .post("/api/cart/items")
      .set(auth(user))
      .send({ productId: product.id, quantity: 0 });
    expect(zero.status).toBe(422);

    const huge = await request(app)
      .post("/api/cart/items")
      .set(auth(user))
      .send({ productId: product.id, quantity: 1000 });
    expect(huge.status).toBe(422);
  });
});

describe("PATCH /api/cart/items/:id", () => {
  it("updates quantity and recomputes totals", async () => {
    const user = await registerUser(app);
    const product = await createProductDirectly({ priceCents: 750, stock: 10 });
    const added = await request(app)
      .post("/api/cart/items")
      .set(auth(user))
      .send({ productId: product.id, quantity: 2 });
    const itemId = added.body.cart.items[0].id;

    const res = await request(app)
      .patch(`/api/cart/items/${itemId}`)
      .set(auth(user))
      .send({ quantity: 4 });

    expect(res.status).toBe(200);
    expect(res.body.cart.items[0].quantity).toBe(4);
    expect(res.body.cart.totalCents).toBe(3000);
  });

  it("cannot update another user's cart item (404)", async () => {
    const alice = await registerUser(app, { email: "alice@example.com" });
    const mallory = await registerUser(app, { email: "mallory@example.com" });
    const product = await createProductDirectly();
    const added = await request(app)
      .post("/api/cart/items")
      .set(auth(alice))
      .send({ productId: product.id, quantity: 1 });
    const itemId = added.body.cart.items[0].id;

    const res = await request(app)
      .patch(`/api/cart/items/${itemId}`)
      .set(auth(mallory))
      .send({ quantity: 50 });

    expect(res.status).toBe(404);

    // Alice's quantity is untouched.
    const aliceCart = await request(app).get("/api/cart").set(auth(alice));
    expect(aliceCart.body.cart.items[0].quantity).toBe(1);
  });

  it("rejects quantity above stock with 400", async () => {
    const user = await registerUser(app);
    const product = await createProductDirectly({ stock: 3 });
    const added = await request(app)
      .post("/api/cart/items")
      .set(auth(user))
      .send({ productId: product.id, quantity: 1 });
    const itemId = added.body.cart.items[0].id;

    const res = await request(app)
      .patch(`/api/cart/items/${itemId}`)
      .set(auth(user))
      .send({ quantity: 10 });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/cart/items/:id", () => {
  it("removes an item", async () => {
    const user = await registerUser(app);
    const product = await createProductDirectly();
    const added = await request(app)
      .post("/api/cart/items")
      .set(auth(user))
      .send({ productId: product.id, quantity: 1 });
    const itemId = added.body.cart.items[0].id;

    const res = await request(app).delete(`/api/cart/items/${itemId}`).set(auth(user));
    expect(res.status).toBe(200);
    expect(res.body.cart.items).toEqual([]);
    expect(res.body.cart.totalCents).toBe(0);

    const count = await prisma.cartItem.count();
    expect(count).toBe(0);
  });

  it("cannot delete another user's cart item (404)", async () => {
    const alice = await registerUser(app, { email: "alice@example.com" });
    const mallory = await registerUser(app, { email: "mallory@example.com" });
    const product = await createProductDirectly();
    const added = await request(app)
      .post("/api/cart/items")
      .set(auth(alice))
      .send({ productId: product.id, quantity: 1 });

    const res = await request(app)
      .delete(`/api/cart/items/${added.body.cart.items[0].id}`)
      .set(auth(mallory));
    expect(res.status).toBe(404);

    const count = await prisma.cartItem.count();
    expect(count).toBe(1);
  });

  it("returns 404 for an unknown cart item id", async () => {
    const user = await registerUser(app);
    const res = await request(app)
      .delete("/api/cart/items/clxxxxxxxxxxxxxxxxxxxxxxx")
      .set(auth(user));
    expect(res.status).toBe(404);
  });
});
