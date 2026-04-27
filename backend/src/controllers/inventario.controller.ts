import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export class InventarioController {
  // Stock actual (productos + variantes)
  async getStock(req: Request, res: Response) {
    const { productoId, varianteId } = req.query;
    const where: any = {};
    if (productoId) where.id_producto = parseInt(productoId as string);
    if (varianteId) where.id_variante = parseInt(varianteId as string);
    const stock = await prisma.inv_stock_producto.findMany({
      where,
      include: { producto: true, variante: true, almacen: true }
    });
    res.json(stock);
  }

  // Ajuste manual de stock
  async ajustarStock(req: AuthRequest, res: Response) {
    const { id_producto, id_variante, id_almacen, cantidad, motivo } = req.body;
    if (!id_producto && !id_variante) return res.status(400).json({ error: 'Se requiere producto o variante' });
    const stock = await prisma.inv_stock_producto.findFirst({
      where: {
        id_producto: id_producto || undefined,
        id_variante: id_variante || undefined,
        id_almacen
      }
    });
    if (!stock) {
      // Crear nuevo registro de stock
      await prisma.inv_stock_producto.create({
        data: { id_producto, id_variante, id_almacen, cantidad }
      });
    } else {
      await prisma.inv_stock_producto.update({
        where: { id: stock.id },
        data: { cantidad: stock.cantidad + cantidad }
      });
    }
    // Registrar movimiento
    await prisma.inv_movimientos_inventario.create({
      data: {
        id_producto,
        id_variante,
        tipo: 'ajuste',
        cantidad,
        motivo,
        id_usuario: req.user!.id
      }
    });
    res.json({ message: 'Stock actualizado' });
  }

  // Obtener movimientos
  async getMovimientos(req: Request, res: Response) {
    const { productoId, fechaInicio, fechaFin } = req.query;
    const where: any = {};
    if (productoId) where.id_producto = parseInt(productoId as string);
    if (fechaInicio) where.fecha = { gte: new Date(fechaInicio as string) };
    if (fechaFin) where.fecha = { ...where.fecha, lte: new Date(fechaFin as string) };
    const movimientos = await prisma.inv_movimientos_inventario.findMany({
      where,
      orderBy: { fecha: 'desc' },
      include: { producto: true, variante: true }
    });
    res.json(movimientos);
  }

  // Proveedores CRUD
  async listProveedores(req: Request, res: Response) {
    const proveedores = await prisma.inv_proveedores.findMany();
    res.json(proveedores);
  }
  async createProveedor(req: Request, res: Response) {
    const proveedor = await prisma.inv_proveedores.create({ data: req.body });
    res.status(201).json(proveedor);
  }
  // similar update, delete

  // Órdenes de compra
  async listOrdenesCompra(req: Request, res: Response) {
    const ordenes = await prisma.inv_ordenes_compra.findMany({
      include: { proveedor: true, almacen: true, detalles: { include: { producto: true, variante: true } } }
    });
    res.json(ordenes);
  }
  async createOrdenCompra(req: Request, res: Response) {
    const { id_proveedor, id_almacen, detalles } = req.body;
    if (!id_proveedor || !id_almacen) return res.status(400).json({ error: 'id_proveedor e id_almacen son requeridos' });
    if (!Array.isArray(detalles) || detalles.length === 0) return res.status(400).json({ error: 'detalles es requerido' });

    const detallesNormalizados = detalles.map((d: any) => ({
      id_producto: d.id_producto ? Number(d.id_producto) : null,
      id_variante: d.id_variante ? Number(d.id_variante) : null,
      cantidad: Number(d.cantidad),
      costo_unitario: Number(d.costo_unitario),
    }));

    for (const d of detallesNormalizados) {
      if (!d.id_producto && !d.id_variante) return res.status(400).json({ error: 'Cada detalle requiere id_producto o id_variante' });
      if (!Number.isFinite(d.cantidad) || d.cantidad <= 0) return res.status(400).json({ error: 'cantidad inválida' });
      if (!Number.isFinite(d.costo_unitario) || d.costo_unitario < 0) return res.status(400).json({ error: 'costo_unitario inválido' });
    }

    const total = detallesNormalizados.reduce((acc: number, d: any) => acc + d.cantidad * d.costo_unitario, 0);
    const orden = await prisma.inv_ordenes_compra.create({
      data: {
        id_proveedor: Number(id_proveedor),
        id_almacen: Number(id_almacen),
        total: Number(total.toFixed(2)),
        detalles: { create: detallesNormalizados }
      }
    });
    res.status(201).json(orden);
  }
  async recibirOrdenCompra(req: Request, res: Response) {
    const { id } = req.params;
    const ordenId = parseInt(id);
    if (!Number.isFinite(ordenId)) return res.status(400).json({ error: 'id inválido' });

    const existente = await prisma.inv_ordenes_compra.findUnique({ where: { id: ordenId } });
    if (!existente) return res.status(404).json({ error: 'Orden de compra no encontrada' });
    if (existente.estado === 'recibida') return res.status(409).json({ error: 'La orden de compra ya fue recibida' });

    const orden = await prisma.inv_ordenes_compra.update({
      where: { id: parseInt(id) },
      data: { estado: 'recibida', fecha_recepcion: new Date() }
    });
    // Actualizar stock automáticamente
    const detalles = await prisma.inv_detalle_orden_compra.findMany({ where: { id_orden_compra: orden.id } });
    for (const det of detalles) {
      const stockExistente = await prisma.inv_stock_producto.findFirst({
        where: {
          id_producto: det.id_producto,
          id_variante: det.id_variante,
          id_almacen: orden.id_almacen,
        },
      });
      if (stockExistente) {
        await prisma.inv_stock_producto.update({
          where: { id: stockExistente.id },
          data: { cantidad: { increment: det.cantidad } },
        });
      } else {
        await prisma.inv_stock_producto.create({
          data: { id_producto: det.id_producto, id_variante: det.id_variante, id_almacen: orden.id_almacen, cantidad: det.cantidad },
        });
      }
      await prisma.inv_movimientos_inventario.create({
        data: {
          id_producto: det.id_producto,
          id_variante: det.id_variante,
          tipo: 'entrada',
          cantidad: det.cantidad,
          motivo: `Recepción orden compra #${orden.id}`
        }
      });
    }
    res.json(orden);
  }
}
