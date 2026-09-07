import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { sendValidationError } from '@/utils/apiResponse';

export function validate(schema: AnyZodObject) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      // Apply transforms, coercions and defaults from the schema back onto the
      // request. Without this, empty-string -> undefined transforms never reach
      // the controller, so values like siteId:'' end up hitting Prisma as a
      // non-null FK. Merge keeps any undeclared keys the schema doesn't touch.
      req.body = { ...req.body, ...parsed.body };
      req.query = { ...req.query, ...parsed.query };
      req.params = { ...req.params, ...parsed.params };
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
          code: e.code,
        }));
        sendValidationError(res, 'Validation failed', details);
        return;
      }
      sendValidationError(res, 'Validation failed', String(error));
    }
  };
}