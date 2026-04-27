import { z } from 'zod';

export const ordenSchema = z.object({
  items: z.array(z.object({
    productoId: z.number(),
    cantidad: z.number().positive(),
  })),
});
