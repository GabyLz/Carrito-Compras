import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export class DevolucionController {
  async solicitar(req: AuthRequest, res: Response) {
    const { id_orden, motivo, items } = req.body;
    const orden = await prisma.ord_ordenes.findUnique({ where: { id: id_orden }, include: { cliente: true } });
    if (!orden) return res.status(404).json({ error: 'Orden no encontrada' });
    if (orden.id_cliente !== req.user!.id && req.user!.rol !== 'admin') return res.status(403).json({ error: 'No autorizado' });
    // Verificar estado (solo entregado o pagado, según reglas)
    const devolucion = await prisma.ord_devoluciones.create({
      data: { id_orden, motivo, estado: 'solicitada' }
    });
    for (const item of items) {
      await prisma.ord_devolucion_items.create({
        data: { id_devolucion: devolucion.id, id_item_orden: item.id_item_orden, cantidad_devuelta: item.cantidad }
      });
    }
    res.status(201).json(devolucion);
  }
  async listAdmin(req: Request, res: Response) {
    const devoluciones = await prisma.ord_devoluciones.findMany({ include: { orden: true, items: true } });
    res.json(devoluciones);
  }
  async aprobar(req: Request, res: Response) {
    const { id } = req.params;
    const { monto_reembolsado, comentario } = req.body;
    const devolucion = await prisma.ord_devoluciones.update({
      where: { id: parseInt(id) },
      data: { estado: 'aprobada', monto_reembolsado, comentario_administrador: comentario, fecha_resolucion: new Date() }
    });
    // Actualizar stock: devolver productos al inventario
    const items = await prisma.ord_devolucion_items.findMany({ where: { id_devolucion: devolucion.id }, include: { item_orden: true } });
    for (const item of items) {
      await prisma.inv_stock_producto.updateMany({
        where: { id_producto: item.item_orden.id_producto, id_almacen: 1 },
        data: { cantidad: { increment: item.cantidad_devuelta } }
      });
    }
    res.json(devolucion);
  }
}