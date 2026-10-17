import { z } from "zod";

const idSchema = z.string().cuid("Invalid product id");

export const listProductsQuerySchema = z.object({
  category: z.string().trim().min(1).max(100).optional(),
  search: z.string().trim().min(1).max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

export const productParamsSchema = z.object({ id: idSchema });

export const createProductSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(5000),
  priceCents: z.number().int().min(1).max(100_000_000),
  imageUrl: z.string().url().max(2000).optional().or(z.literal("")).optional(),
  category: z.string().trim().min(1).max(100).optional(),
  stock: z.number().int().min(0).max(1_000_000).default(0),
});

export const updateProductSchema = createProductSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
