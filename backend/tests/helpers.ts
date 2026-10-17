import bcrypt from "bcryptjs";
import type { Express } from "express";
import request from "supertest";
import { prisma } from "../src/lib/prisma.js";

export async function resetDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "User", "Product" RESTART IDENTITY CASCADE`,
  );
}

export interface TestUser {
  id: string;
  email: string;
  name: string;
  password: string;
  token: string;
}

/** Registers a user through the real HTTP API and returns credentials + JWT. */
export async function registerUser(
  app: Express,
  overrides: Partial<{ email: string; password: string; name: string }> = {},
): Promise<TestUser> {
  const email = overrides.email ?? `user-${Math.random().toString(36).slice(2)}@example.com`;
  const password = overrides.password ?? "password123";
  const name = overrides.name ?? "Test User";

  const res = await request(app).post("/api/auth/register").send({ email, password, name });
  if (res.status !== 201) {
    throw new Error(`registerUser failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { id: res.body.user.id, email, name, password, token: res.body.token };
}

/** Creates a user directly in the database (e.g. to seed an ADMIN). */
export async function createUserDirectly(
  attrs: Partial<{ email: string; password: string; name: string; role: "CUSTOMER" | "ADMIN" }> = {},
) {
  const email = attrs.email ?? `direct-${Math.random().toString(36).slice(2)}@example.com`;
  const password = attrs.password ?? "password123";
  const user = await prisma.user.create({
    data: {
      email,
      name: attrs.name ?? "Direct User",
      passwordHash: await bcrypt.hash(password, 4),
      role: attrs.role ?? "CUSTOMER",
      cart: { create: {} },
    },
  });
  return user;
}

export async function login(app: Express, email: string, password: string): Promise<string> {
  const res = await request(app).post("/api/auth/login").send({ email, password });
  if (res.status !== 200) {
    throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.token;
}

export async function createProductDirectly(
  overrides: Partial<{
    name: string;
    description: string;
    priceCents: number;
    category: string;
    stock: number;
    imageUrl: string;
    isActive: boolean;
  }> = {},
) {
  return prisma.product.create({
    data: {
      name: overrides.name ?? "Test Product",
      description: overrides.description ?? "A product used in tests",
      priceCents: overrides.priceCents ?? 1000,
      category: overrides.category ?? "Test",
      stock: overrides.stock ?? 10,
      imageUrl: overrides.imageUrl ?? null,
      isActive: overrides.isActive ?? true,
    },
  });
}
