import { z } from 'zod';

export const productoSchema = z.object({
  nombre: z.string(),
  precio: z.number().positive(),
  stock: z.number().int().nonnegative(),
});
