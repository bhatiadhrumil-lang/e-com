import { Router } from "express";
import * as orderService from "../services/order.service.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { listOrdersQuerySchema, orderParamsSchema, type ListOrdersQuery } from "../schemas/order.schema.js";

const router = Router();

router.use(requireAuth);

router.post("/", async (req, res, next) => {
  try {
    const order = await orderService.createOrder(req.user!.id);
    res.status(201).json({ order });
  } catch (err) {
    next(err);
  }
});

router.get("/", validate(listOrdersQuerySchema, "query"), async (req, res, next) => {
  try {
    const result = await orderService.listOrders(req.user!.id, req.query as unknown as ListOrdersQuery);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", validate(orderParamsSchema, "params"), async (req, res, next) => {
  try {
    const order = await orderService.getOrder(req.user!.id, req.params.id);
    res.status(200).json({ order });
  } catch (err) {
    next(err);
  }
});

export default router;
