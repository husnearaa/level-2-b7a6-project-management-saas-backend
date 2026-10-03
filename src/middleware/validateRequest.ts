
import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";

const validateRequest = (schema: ZodType) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      await schema.parseAsync({
        body: req.body,
        params: req.params,
        query: req.query,
      });

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default validateRequest;