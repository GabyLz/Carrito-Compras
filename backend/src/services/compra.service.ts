import { CompraRepository } from '../repositories/compra.repo';

export class CompraService {
  private repository: CompraRepository;

  constructor() {
    this.repository = new CompraRepository();
  }

  async getAllOrdenes() {
    return this.repository.findAll();
  }

  async getOrdenById(id: number) {
    const orden = await this.repository.findById(id);
    if (!orden) {
      throw new Error('Orden de compra no encontrada');
    }
    return orden;
  }

  async createOrden(data: any) {
    if (!data.id_proveedor) throw new Error('El proveedor es requerido');
    if (!data.id_almacen) throw new Error('El almacén de destino es requerido');
    if (!data.detalles || data.detalles.length === 0) throw new Error('La orden debe tener al menos un producto');

    // Calculate total if not provided and validate details
    let calculatedTotal = 0;
    for (const detail of data.detalles) {
      if (!detail.id_producto && !detail.id_variante) {
        throw new Error('Cada detalle debe especificar un producto o variante');
      }
      if (Number(detail.cantidad) <= 0) {
        throw new Error(`Cantidad inválida para el producto ID: ${detail.id_producto}`);
      }
      if (Number(detail.costo_unitario) < 0) {
        throw new Error(`Costo unitario inválido para el producto ID: ${detail.id_producto}`);
      }
      calculatedTotal += Number(detail.costo_unitario) * Number(detail.cantidad);
    }

    data.total = data.total || calculatedTotal;
    data.estado = data.estado || 'pendiente'; // Estado inicial por defecto

    const prisma = (await import('../lib/prisma')).default;
    
    return await prisma.$transaction(async (tx) => {
      // 1. Create the purchase order
      const orden = await this.repository.create(data);

      // 2. Create basic account payable
      await tx.inv_cuentas_por_pagar.create({
        data: {
          id_proveedor: orden.id_proveedor,
          id_orden_compra: orden.id,
          monto_total: orden.total ?? 0,
          estado: 'pendiente',
          fecha_vencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // 3. Optional: Registrar movimiento de "orden generada" (informativo)
      // Note: We don't update stock here, that's done on reception.

      return orden;
    });
  }

  // Remove the old private createCuentaPorPagar as it's now in the transaction
  // (We'll let SearchReplace handle the removal if we match correctly)

  async updateStatus(id: number, estado: string) {
    const orden = await this.getOrdenById(id);
    return this.repository.updateStatus(id, estado);
  }

  async registrarRecepcion(id: number) {
    const prisma = (await import('../lib/prisma')).default;
    const orden = await this.getOrdenById(id);

    if (orden.estado === 'recibido') {
      throw new Error('La orden ya ha sido recibida');
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Create reception record
      await tx.inv_recepciones.create({
        data: {
          id_orden_compra: id,
          estado: 'recibido',
        },
      });

      // 2. Update order status and reception date
      await tx.inv_ordenes_compra.update({
        where: { id },
        data: {
          estado: 'recibido',
          fecha_recepcion: new Date(),
        },
      });

      // 3. Update stock and create movement records for each item
      for (const detalle of orden.detalles) {
        // Update product/variant stock in the specific warehouse
        // We use findFirst instead of findUnique to handle nulls in the compound key if necessary,
        // although upsert is preferred if the unique constraint is reliable.
        const stockRecord = await tx.inv_stock_producto.findFirst({
          where: {
            id_producto: detalle.id_producto,
            id_variante: detalle.id_variante,
            id_almacen: orden.id_almacen,
          },
        });

        if (stockRecord) {
          await tx.inv_stock_producto.update({
            where: { id: stockRecord.id },
            data: { cantidad: { increment: detalle.cantidad } },
          });
        } else {
          await tx.inv_stock_producto.create({
            data: {
              id_producto: detalle.id_producto,
              id_variante: detalle.id_variante,
              id_almacen: orden.id_almacen,
              cantidad: detalle.cantidad,
            },
          });
        }

        // Create movement record
        await tx.inv_movimientos_inventario.create({
          data: {
            id_producto: detalle.id_producto,
            id_variante: detalle.id_variante,
            tipo: 'entrada',
            cantidad: detalle.cantidad,
            motivo: `Recepción de orden de compra #${id}`,
          },
        });

        // Update general stock in cat_productos
        if (detalle.id_producto) {
          await tx.cat_productos.update({
            where: { id: detalle.id_producto },
            data: { stock_general: { increment: detalle.cantidad } },
          });
        }

        // Update variant stock if applicable
        if (detalle.id_variante) {
          await tx.cat_producto_variante.update({
            where: { id: detalle.id_variante },
            data: { stock: { increment: detalle.cantidad } },
          });
        }
      }

      return { message: 'Recepción registrada y stock actualizado' };
    });
  }
}
