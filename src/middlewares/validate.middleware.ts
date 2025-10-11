import { NextFunction, Request, Response } from 'express';
import { validationResult, ValidationError } from 'express-validator';

export function validateRequest(req: Request, res: Response, next: NextFunction) {
    const errors = validationResult(req);

    if (errors.isEmpty()) return next();

    const formatted = errors.array().map((e: ValidationError) => {
        if ('param' in e) {
            return { field: e.param, msg: e.msg };
        }
        // fallback por si es otro tipo de error alternativo
        return { field: 'unknown', msg: e.msg };
    });

    return res.status(422).json({
        message: 'Validación fallida',
        errors: formatted,
    });
}
