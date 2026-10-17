import { Router } from "express";
import * as productService from "../services/product.service.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createProductSchema,
  listProductsQuerySchema,
  productParamsSchema,
  updateProductSchema,
  type ListProductsQuery,
} from "../schemas/product.schema.js";

const router = Router();

router.get("/", validate(listProductsQuerySchema, "query"), async (req, res, next) => {
  try {
    const result = await productService.listProducts(req.query as unknown as ListProductsQuery);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", validate(productParamsSchema, "params"), async (req, res, next) => {
  try {
    const product = await productService.getProduct(req.params.id);
    res.status(200).json({ product });
  } catch (err) {
    next(err);
  }
});

// Admin-only product management (RBAC demonstration).
router.post(
  "/",
  requireAuth,
  requireAdmin,
  validate(createProductSchema),
  async (req, res, next) => {
    try {
      const product = await productService.createProduct(req.body);
      res.status(201).json({ product });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  "/:id",
  requireAuth,
  requireAdmin,
  validate(productParamsSchema, "params"),
  validate(updateProductSchema),
  async (req, res, next) => {
    try {
      const product = await productService.updateProduct(req.params.id, req.body);
      res.status(200).json({ product });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
