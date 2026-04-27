import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Error de validación',
        details: err.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message
        }))
      }
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: 'Ya existe un registro con estos datos (SKU o Código duplicado)' } });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Registro no encontrado' } });
    }
  }

  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Error interno del servidor',
    },
  });
};