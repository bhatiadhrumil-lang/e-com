import { prisma } from "../lib/prisma.js";
import { badRequest, notFound } from "../lib/errors.js";
import { toProductResponse, type ProductResponse } from "./product.service.js";

export interface CartItemResponse {
  id: string;
  quantity: number;
  subtotalCents: number;
  product: ProductResponse;
}

export interface CartResponse {
  id: string;
  items: CartItemResponse[];
  itemCount: number;
  totalCents: number;
}

function shapeCart(cart: {
  id: string;
  items: {
    id: string;
    quantity: number;
    product: Parameters<typeof toProductResponse>[0];
  }[];
}): CartResponse {
  const items = cart.items.map((item) => ({
    id: item.id,
    quantity: item.quantity,
    subtotalCents: item.quantity * item.product.priceCents,
    product: toProductResponse(item.product),
  }));
  return {
    id: cart.id,
    items,
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    totalCents: items.reduce((sum, i) => sum + i.subtotalCents, 0),
  };
}

async function getOrCreateCart(userId: string) {
  const existing = await prisma.cart.findUnique({
    where: { userId },
    include: { items: { include: { product: true }, orderBy: { createdAt: "asc" } } },
  });
  if (existing) return existing;
  return prisma.cart.create({
    data: { userId },
    include: { items: { include: { product: true }, orderBy: { createdAt: "asc" } } },
  });
}

export async function getCart(userId: string): Promise<CartResponse> {
  const cart = await getOrCreateCart(userId);
  return shapeCart(cart);
}

export async function addCartItem(
  userId: string,
  productId: string,
  quantity: number,
): Promise<CartResponse> {
  const product = await prisma.product.findFirst({
    where: { id: productId, isActive: true },
  });
  if (!product) {
    throw notFound("Product not found");
  }

  const cart = await getOrCreateCart(userId);
  const existingItem = cart.items.find((i) => i.productId === productId);
  const newQuantity = (existingItem?.quantity ?? 0) + quantity;

  if (newQuantity > product.stock) {
    throw badRequest(`Only ${product.stock} unit(s) of "${product.name}" are in stock`);
  }

  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId } },
    create: { cartId: cart.id, productId, quantity: newQuantity },
    update: { quantity: newQuantity },
  });

  return getCart(userId);
}

export async function updateCartItem(
  userId: string,
  itemId: string,
  quantity: number,
): Promise<CartResponse> {
  const cart = await getOrCreateCart(userId);
  const item = cart.items.find((i) => i.id === itemId);
  if (!item) {
    throw notFound("Cart item not found");
  }
  if (quantity > item.product.stock) {
    throw badRequest(
      `Only ${item.product.stock} unit(s) of "${item.product.name}" are in stock`,
    );
  }

  await prisma.cartItem.update({
    where: { id: itemId },
    data: { quantity },
  });

  return getCart(userId);
}

export async function removeCartItem(userId: string, itemId: string): Promise<CartResponse> {
  const cart = await getOrCreateCart(userId);
  const item = cart.items.find((i) => i.id === itemId);
  if (!item) {
    throw notFound("Cart item not found");
  }

  await prisma.cartItem.delete({ where: { id: itemId } });
  return getCart(userId);
}
