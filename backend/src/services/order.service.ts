import type { Order, OrderItem } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { badRequest, notFound } from "../lib/errors.js";
import type { ListOrdersQuery } from "../schemas/order.schema.js";

export interface OrderItemResponse {
  id: string;
  productId: string | null;
  productName: string;
  productImageUrl: string | null;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
}

export interface OrderResponse {
  id: string;
  status: Order["status"];
  totalCents: number;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
  items: OrderItemResponse[];
}

function shapeOrder(order: Order & { items: OrderItem[] }): OrderResponse {
  const items = order.items.map((item) => ({
    id: item.id,
    productId: item.productId,
    productName: item.productName,
    productImageUrl: item.productImageUrl,
    unitPriceCents: item.unitPriceCents,
    quantity: item.quantity,
    lineTotalCents: item.unitPriceCents * item.quantity,
  }));
  return {
    id: order.id,
    status: order.status,
    totalCents: order.totalCents,
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items,
  };
}

/**
 * Creates an order from the user's current cart inside a single transaction:
 * - snapshots product name/price/image onto OrderItem (historical fidelity)
 * - decrements stock (with an oversell guard)
 * - clears the cart
 */
export async function createOrder(userId: string): Promise<OrderResponse> {
  const order = await prisma.$transaction(async (tx) => {
    const cart = await tx.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } },
    });

    if (!cart || cart.items.length === 0) {
      throw badRequest("Cannot place an order with an empty cart");
    }

    for (const item of cart.items) {
      if (!item.product.isActive) {
        throw badRequest(`"${item.product.name}" is no longer available`);
      }
      if (item.quantity > item.product.stock) {
        throw badRequest(`Only ${item.product.stock} unit(s) of "${item.product.name}" remain`);
      }
    }

    const totalCents = cart.items.reduce(
      (sum, item) => sum + item.quantity * item.product.priceCents,
      0,
    );

    const created = await tx.order.create({
      data: {
        userId,
        totalCents,
        status: "PENDING",
        items: {
          create: cart.items.map((item) => ({
            productId: item.product.id,
            productName: item.product.name,
            productDescription: item.product.description,
            productImageUrl: item.product.imageUrl,
            unitPriceCents: item.product.priceCents,
            quantity: item.quantity,
          })),
        },
      },
      include: { items: true },
    });

    // Decrement stock with an oversell guard.
    for (const item of cart.items) {
      const result = await tx.product.updateMany({
        where: { id: item.product.id, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (result.count === 0) {
        throw badRequest(`"${item.product.name}" just went out of stock`);
      }
    }

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    return created;
  });

  return shapeOrder(order);
}

export async function listOrders(userId: string, query: ListOrdersQuery) {
  const where = { userId };
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  return {
    items: orders.map(shapeOrder),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function getOrder(userId: string, orderId: string): Promise<OrderResponse> {
  // 404 (not 403) for other users' orders so we do not leak existence.
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: { items: true },
  });
  if (!order) {
    throw notFound("Order not found");
  }
  return shapeOrder(order);
}
