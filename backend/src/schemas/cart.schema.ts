import { z } from "zod";

export const addCartItemSchema = z.object({
  productId: z.string().cuid("Invalid product id"),
  quantity: z.number().int().min(1, "Quantity must be at least 1").max(99).default(1),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1, "Quantity must be at least 1").max(99),
});

export const cartItemParamsSchema = z.object({
  id: z.string().cuid("Invalid cart item id"),
});

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
