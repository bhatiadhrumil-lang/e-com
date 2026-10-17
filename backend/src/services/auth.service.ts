import type { User } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { conflict, unauthorized } from "../lib/errors.js";
import { signToken } from "../lib/jwt.js";
import type { LoginInput, RegisterInput } from "../schemas/auth.schema.js";

const BCRYPT_ROUNDS = 10;

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: User["role"];
  createdAt: Date;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw conflict("An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      name: input.name,
      cart: { create: {} },
    },
  });

  return {
    user: toPublicUser(user),
    token: signToken({ id: user.id, role: user.role }),
  };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  // Constant-ish failure message: do not reveal whether the email exists.
  if (!user) {
    throw unauthorized("Invalid email or password");
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw unauthorized("Invalid email or password");
  }

  return {
    user: toPublicUser(user),
    token: signToken({ id: user.id, role: user.role }),
  };
}

export async function getMe(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw unauthorized("Invalid token");
  }
  return toPublicUser(user);
}
