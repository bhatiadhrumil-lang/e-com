import { Router } from "express";
import * as cartService from "../services/cart.service.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  addCartItemSchema,
  cartItemParamsSchema,
  updateCartItemSchema,
} from "../schemas/cart.schema.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const cart = await cartService.getCart(req.user!.id);
    res.status(200).json({ cart });
  } catch (err) {
    next(err);
  }
});

router.post("/items", validate(addCartItemSchema), async (req, res, next) => {
  try {
    const cart = await cartService.addCartItem(
      req.user!.id,
      req.body.productId,
      req.body.quantity,
    );
    res.status(201).json({ cart });
  } catch (err) {
    next(err);
  }
});

router.patch(
  "/items/:id",
  validate(cartItemParamsSchema, "params"),
  validate(updateCartItemSchema),
  async (req, res, next) => {
    try {
      const cart = await cartService.updateCartItem(
        req.user!.id,
        req.params.id,
        req.body.quantity,
      );
      res.status(200).json({ cart });
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  "/items/:id",
  validate(cartItemParamsSchema, "params"),
  async (req, res, next) => {
    try {
      const cart = await cartService.removeCartItem(req.user!.id, req.params.id);
      res.status(200).json({ cart });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
