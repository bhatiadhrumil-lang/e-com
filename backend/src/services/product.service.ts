import type { Product } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { notFound } from "../lib/errors.js";
import type {
  CreateProductInput,
  ListProductsQuery,
  UpdateProductInput,
} from "../schemas/product.schema.js";

export interface ProductResponse {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  imageUrl: string | null;
  category: string | null;
  stock: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function toProductResponse(product: Product): ProductResponse {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    priceCents: product.priceCents,
    imageUrl: product.imageUrl,
    category: product.category,
    stock: product.stock,
    isActive: product.isActive,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

export async function listProducts(query: ListProductsQuery) {
  const where = {
    isActive: true,
    ...(query.category ? { category: query.category } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" as const } },
            { description: { contains: query.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items: items.map(toProductResponse),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function getProduct(id: string): Promise<ProductResponse> {
  const product = await prisma.product.findFirst({
    where: { id, isActive: true },
  });
  if (!product) {
    throw notFound("Product not found");
  }
  return toProductResponse(product);
}

export async function createProduct(input: CreateProductInput): Promise<ProductResponse> {
  const product = await prisma.product.create({
    data: {
      name: input.name,
      description: input.description,
      priceCents: input.priceCents,
      imageUrl: input.imageUrl || null,
      category: input.category ?? null,
      stock: input.stock,
    },
  });
  return toProductResponse(product);
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput,
): Promise<ProductResponse> {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    throw notFound("Product not found");
  }
  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.priceCents !== undefined ? { priceCents: input.priceCents } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl || null } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.stock !== undefined ? { stock: input.stock } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
  return toProductResponse(product);
}
