import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';


export function validate(schema: z.ZodTypeAny, path: 'body'|'params'|'query' = 'body') {
return (req: Request, res: Response, next: NextFunction) => {
const result = schema.safeParse((req as any)[path]);
if (!result.success) {
return res.status(400).json({ success: false, error: result.error.flatten() });
}
(req as any)[path] = result.data;
next();
};
}