import { z } from "zod";

export const orderParamsSchema = z.object({
  id: z.string().cuid("Invalid order id"),
});

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
