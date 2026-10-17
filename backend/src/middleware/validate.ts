import type { Request, Response, NextFunction } from "express";
import { ZodError, type ZodSchema } from "zod";
import { unprocessableEntity } from "../lib/errors.js";

type RequestPart = "body" | "query" | "params";

export function validate(schema: ZodSchema, part: RequestPart = "body") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      next(formatValidationError(result.error, part));
      return;
    }
    // Express 4 exposes req.query as an uncached prototype getter, so mutating
    // the returned object would be discarded. Shadow it with an own property.
    Object.defineProperty(req, part, {
      value: result.data,
      writable: true,
      configurable: true,
      enumerable: true,
    });
    next();
  };
}

function formatValidationError(error: ZodError, part: RequestPart) {
  const details = error.issues.map((issue) => ({
    field: [part, ...issue.path].join("."),
    message: issue.message,
  }));
  return unprocessableEntity("Validation failed", details);
}
