import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import PDFDocument from 'pdfkit';
import { CalculoService } from '../services/calculo.service';

export class OrdenController {
  private money(value: unknown) {
    return `S/ ${Number(value || 0).toFixed(2)}`;
  }

  private drawPdfHeader(doc: PDFDocument, title: string, subtitle: string) {
    const pageWidth = doc.page.width;
    doc.rect(0, 0, pageWidth, 95).fill('#0f172a');
    doc.fillColor('#ffffff').fontSize(11).text('Commerce Suite', 40, 24);
    doc.fontSize(21).text(title, 40, 38);
    doc.fillColor('#cbd5e1').fontSize(10).text(subtitle, 40, 67);
    doc.fillColor('#0f172a');
  }

  private drawMetaCard(doc: PDFDocument, x: number, y: number, w: number, h: number, label: string, value: string) {
    doc.roundedRect(x, y, w, h, 8).fillAndStroke('#f8fafc', '#e2e8f0');
    doc.fillColor('#64748b').fontSize(9).text(label, x + 10, y + 9);
    doc.fillColor('#0f172a').fontSize(11).text(value, x + 10, y + 24, { width: w - 20 });
  }

  private drawItemsTable(doc: PDFDocument, rows: Array<{ nombre: string; cantidad: number; precio: number; subtotal: number }>, startY: number) {
    const startX = 40;
    const fullWidth = 515;
    const cols = [250, 70, 95, 100];
    const headers = ['Producto', 'Cant.', 'P. Unit', 'Subtotal'];

    doc.roundedRect(startX, startY, fullWidth, 24, 6).fill('#e2e8f0');
    doc.fillColor('#334155').fontSize(9);

    let x = startX + 10;
    headers.forEach((header, index) => {
      const align = index > 0 ? 'right' : 'left';
      doc.text(header, x, startY + 8, { width: cols[index] - 14, align });
      x += cols[index];
    });

    let currentY = startY + 28;
    rows.forEach((row, index) => {
      if (currentY > 720) {
        doc.addPage();
        currentY = 40;
      }

      if (index % 2 === 0) {
        doc.roundedRect(startX, currentY - 3, fullWidth, 22, 5).fill('#f8fafc');
      }

      doc.fillColor('#0f172a').fontSize(9);
      doc.text(row.nombre, startX + 10, currentY + 4, { width: cols[0] - 14 });
      doc.text(String(row.cantidad), startX + cols[0] + 10, currentY + 4, { width: cols[1] - 14, align: 'right' });
      doc.text(this.money(row.precio), startX + cols[0] + cols[1] + 10, currentY + 4, { width: cols[2] - 14, align: 'right' });
      doc.text(this.money(row.subtotal), startX + cols[0] + cols[1] + cols[2] + 10, currentY + 4, { width: cols[3] - 14, align: 'right' });

      currentY += 24;
    });

    return currentY;
  }

  private async findClienteByUserId(userId: number) {
    return prisma.cli_clientes.findFirst({ where: { usuario: { id: userId } } });
  }

  private async findEstado(nombre: string) {
    return prisma.ord_estados_orden.findFirst({ where: { nombre } });
  }

  private async resolveStockDisponible(idProducto: number, idVariante?: number | null) {
    const producto = await prisma.cat_productos.findUnique({
      where: { id: idProducto },
      include: { variantes: true },
    });

    if (!producto) return null;

    const variante = typeof idVariante === 'number'
      ? producto.variantes.find((item) => item.id === idVariante)
      : null;

    return {
      producto,
      variante,
      stockDisponible: Number(variante?.stock ?? producto.stock_general ?? 0),
    };
  }

  private async pushHistorial(idOrden: number, idEstado: number, idUsuario?: number, comentario?: string) {
    await prisma.ord_historial_estados.create({
      data: {
        id_orden: idOrden,
        id_estado: idEstado,
        id_usuario: idUsuario,
        comentario,
      },
    });
  }

  async createOrden(req: AuthRequest, res: Response) {
    const userId = req.user!.id;
    const { direccionId, metodoEnvioId, metodoPagoId, sessionId, couponCode } = req.body;

    const cliente = await this.findClienteByUserId(userId);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
    if (!direccionId) return res.status(400).json({ error: 'direccionId es requerido' });

    const carrito = await prisma.ord_carritos.findUnique({
      where: { id_cliente: cliente.id },
      include: { items: { include: { producto: true, variante: true } } },
    });

    if (!carrito || carrito.items.length === 0) {
      return res.status(400).json({ error: 'Carrito vacio' });
    }

    for (const item of carrito.items) {
      const stockDisponible = Number(item.variante?.stock ?? item.producto.stock_general ?? 0);
      if (item.cantidad > stockDisponible) {
        return res.status(400).json({
          error: `Stock insuficiente para ${item.producto.nombre}. Disponible: ${Math.max(stockDisponible, 0)}`,
        });
      }
    }

    const metodoEnvioIdNum = typeof metodoEnvioId === 'number' ? metodoEnvioId : Number(metodoEnvioId);
    const metodoEnvio = Number.isFinite(metodoEnvioIdNum)
      ? await prisma.ord_metodos_envio.findUnique({ where: { id: metodoEnvioIdNum } })
      : null;

    const ahora = new Date();
    const itemsData = carrito.items.map((item) => {
      let precioActual = Number(item.producto.precio_venta);
      if (item.producto.precio_oferta) {
        if (item.producto.fecha_inicio_oferta && item.producto.fecha_fin_oferta) {
          const inicio = new Date(item.producto.fecha_inicio_oferta);
          const fin = new Date(item.producto.fecha_fin_oferta);
          if (ahora >= inicio && ahora <= fin) {
            precioActual = Number(item.producto.precio_oferta);
          }
        } else if (!item.producto.fecha_inicio_oferta && !item.producto.fecha_fin_oferta) {
          precioActual = Number(item.producto.precio_oferta);
        }
      }
      const precioUnitario = Number((precioActual + Number(item.variante?.precio_ajuste || 0)).toFixed(2));
      const subtotalItem = Number((precioUnitario * item.cantidad).toFixed(2));
      return {
        id_producto: item.id_producto,
        id_variante: item.id_variante,
        cantidad: item.cantidad,
        precio_unitario: precioUnitario,
        subtotal: subtotalItem,
      };
    });

    const calculoService = new CalculoService();
    const totales = await calculoService.calcularTotales(
      carrito.items,
      typeof couponCode === 'string' ? couponCode : undefined,
      metodoEnvio ? metodoEnvio.id : undefined
    );

    const estadoPendiente = (await this.findEstado('pendiente_pago')) || (await this.findEstado('pendiente'));
    if (!estadoPendiente) return res.status(500).json({ error: 'Estado inicial no configurado' });

    const orden = await prisma.ord_ordenes.create({
      data: {
        id_cliente: cliente.id,
        id_direccion_envio: direccionId,
        id_estado: estadoPendiente.id,
        id_metodo_envio: metodoEnvio ? metodoEnvio.id : null,
        id_metodo_pago: metodoPagoId ? Number(metodoPagoId) : null,
        id_cupon_aplicado: totales.cupon?.id ?? null,
        subtotal: totales.subtotal,
        descuento: totales.descuento,
        impuestos: totales.impuesto,
        costo_envio: totales.envio,
        total: totales.total,
        items: { create: itemsData },
      },
    });

    await this.pushHistorial(orden.id, estadoPendiente.id, userId, 'Orden creada desde checkout');

    if (totales.cupon?.id) {
      await prisma.ord_cupones.update({
        where: { id: totales.cupon.id },
        data: { usos_actuales: { increment: 1 } },
      });
    }

    for (const item of carrito.items) {
      await prisma.cat_productos.update({
        where: { id: item.id_producto },
        data: { stock_general: { decrement: item.cantidad } },
      });

      await prisma.inv_movimientos_inventario.create({
        data: {
          id_producto: item.id_producto,
          id_variante: item.id_variante,
          tipo: 'salida',
          cantidad: item.cantidad,
          motivo: `Venta orden #${orden.id}`,
          id_usuario: userId,
        },
      });
    }

    if (sessionId) {
      await prisma.inv_reservas_stock.deleteMany({ where: { session_id: String(sessionId) } });
    }

    await prisma.ord_items_carrito.deleteMany({ where: { id_carrito: carrito.id } });

    return res.json({ ordenId: orden.id, total: totales.total });
  }

  async reservarStock(req: AuthRequest, res: Response) {
    const userId = req.user!.id;
    const sessionId = String(req.body?.sessionId || `checkout-${userId}`);
    const cliente = await this.findClienteByUserId(userId);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

    const carrito = await prisma.ord_carritos.findUnique({
      where: { id_cliente: cliente.id },
      include: { items: { include: { producto: true } } },
    });

    if (!carrito || !carrito.items.length) {
      return res.status(400).json({ error: 'Carrito vacio' });
    }

    await prisma.inv_reservas_stock.deleteMany({ where: { fecha_expiracion: { lte: new Date() } } });
    await prisma.inv_reservas_stock.deleteMany({ where: { session_id: sessionId } });

    for (const item of carrito.items) {
      const stockDisponible = Number(item.variante?.stock ?? item.producto.stock_general ?? 0);
      const reservadas = await prisma.inv_reservas_stock.aggregate({
        _sum: { cantidad: true },
        where: {
          id_producto: item.id_producto,
          id_variante: item.id_variante,
          fecha_expiracion: { gt: new Date() },
        },
      });

      const cantidadReservada = Number(reservadas._sum.cantidad || 0);
      const disponible = stockDisponible - cantidadReservada;
      if (disponible < item.cantidad) {
        return res.status(400).json({
          error: `Stock insuficiente para ${item.producto.nombre}. Disponible: ${Math.max(disponible, 0)}`,
        });
      }

      await prisma.inv_reservas_stock.create({
        data: {
          id_producto: item.id_producto,
          id_variante: item.id_variante,
          id_almacen: 1,
          cantidad: item.cantidad,
          session_id: sessionId,
        },
      });
    }

    return res.json({ message: 'Stock reservado por 15 minutos', sessionId });
  }

  async liberarReserva(req: AuthRequest, res: Response) {
    const sessionId = String(req.body?.sessionId || '');
    if (!sessionId) return res.status(400).json({ error: 'sessionId requerido' });

    await prisma.inv_reservas_stock.deleteMany({ where: { session_id: sessionId } });
    return res.json({ message: 'Reserva liberada' });
  }

  async listMetodosEnvio(req: AuthRequest, res: Response) {
    const existentes = await prisma.ord_metodos_envio.findMany({ orderBy: { id: 'asc' } });
    if (existentes.length) return res.json(existentes);

    await prisma.ord_metodos_envio.createMany({
      data: [
        { nombre: 'Estandar', costo: 18, tiempo_estimado: '2-4 dias' },
        { nombre: 'Express', costo: 30, tiempo_estimado: '24h' },
      ],
      skipDuplicates: true,
    });

    const metodos = await prisma.ord_metodos_envio.findMany({ orderBy: { id: 'asc' } });
    return res.json(metodos);
  }

  async descargarFactura(req: AuthRequest, res: Response) {
    const id = parseInt(req.params.id);
    const orden = await this.getOrdenWithAuth(req, id);
    if ('error' in orden) return res.status(orden.status).json({ error: orden.error });

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=factura-orden-${id}.pdf`);
    doc.pipe(res);

    this.drawPdfHeader(doc, 'Factura electronica', `Documento fiscal | Orden #${orden.id}`);

    const issuedAt = new Date(orden.fecha || new Date()).toLocaleString();
    const clienteNombre = `${orden.cliente?.nombre || ''} ${orden.cliente?.apellido || ''}`.trim() || 'Cliente';
    const estadoNombre = orden.estado?.nombre || '-';

    this.drawMetaCard(doc, 40, 115, 165, 54, 'Fecha de emision', issuedAt);
    this.drawMetaCard(doc, 215, 115, 165, 54, 'Cliente', clienteNombre);
    this.drawMetaCard(doc, 390, 115, 165, 54, 'Estado', estadoNombre);

    doc.fillColor('#0f172a').fontSize(12).text('Detalle de facturacion', 40, 190);
    doc.fillColor('#64748b').fontSize(10).text(`Email: ${orden.cliente?.email || '-'}`, 40, 208);
    doc.text(`Direccion: ${orden.direccion?.calle || '-'} ${orden.direccion?.ciudad || ''}`, 40, 222);
    doc.text(`Metodo de pago: ${orden.metodo_pago?.nombre || 'No especificado'}`, 40, 236);
    doc.text(`Metodo de envio: ${orden.metodo_envio?.nombre || 'No especificado'}`, 40, 250);

    const tableRows = orden.items.map((item) => ({
      nombre: item.producto?.nombre || 'Producto',
      cantidad: Number(item.cantidad || 0),
      precio: Number(item.precio_unitario || 0),
      subtotal: Number(item.subtotal || 0),
    }));

    const afterTableY = this.drawItemsTable(doc, tableRows, 280);
    const summaryY = afterTableY + 12;

    doc.roundedRect(350, summaryY, 205, 110, 10).fillAndStroke('#f8fafc', '#e2e8f0');
    doc.fillColor('#334155').fontSize(10).text('Subtotal', 364, summaryY + 14);
    doc.text(this.money(orden.subtotal), 470, summaryY + 14, { width: 70, align: 'right' });
    doc.text('Descuento', 364, summaryY + 34);
    doc.text(`- ${this.money(orden.descuento)}`, 470, summaryY + 34, { width: 70, align: 'right' });
    doc.text('Impuestos', 364, summaryY + 54);
    doc.text(this.money(orden.impuestos), 470, summaryY + 54, { width: 70, align: 'right' });
    doc.text('Envio', 364, summaryY + 74);
    doc.text(this.money(orden.costo_envio), 470, summaryY + 74, { width: 70, align: 'right' });

    doc.roundedRect(350, summaryY + 92, 205, 34, 8).fill('#0f172a');
    doc.fillColor('#ffffff').fontSize(11).text('TOTAL', 364, summaryY + 104);
    doc.text(this.money(orden.total), 470, summaryY + 104, { width: 70, align: 'right' });

    doc.fillColor('#94a3b8').fontSize(9).text('Gracias por su compra. Documento generado automaticamente por Commerce Suite.', 40, 780, {
      width: 515,
      align: 'center',
    });
    doc.end();
  }

  async descargarComprobante(req: AuthRequest, res: Response) {
    const id = parseInt(req.params.id);
    const orden = await this.getOrdenWithAuth(req, id);
    if ('error' in orden) return res.status(orden.status).json({ error: orden.error });

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=comprobante-orden-${id}.pdf`);
    doc.pipe(res);

    this.drawPdfHeader(doc, 'Comprobante de compra', `Resumen de transaccion | Orden #${orden.id}`);

    const clienteNombre = `${orden.cliente?.nombre || ''} ${orden.cliente?.apellido || ''}`.trim() || 'Cliente';
    this.drawMetaCard(doc, 40, 115, 165, 54, 'Cliente', clienteNombre);
    this.drawMetaCard(doc, 215, 115, 165, 54, 'Fecha', new Date(orden.fecha || new Date()).toLocaleString());
    this.drawMetaCard(doc, 390, 115, 165, 54, 'Tracking', orden.numero_guia || 'Pendiente');

    doc.roundedRect(40, 190, 515, 118, 10).fillAndStroke('#f8fafc', '#e2e8f0');
    doc.fillColor('#0f172a').fontSize(12).text('Resumen del pago', 56, 206);
    doc.fillColor('#475569').fontSize(10).text(`Estado de la orden: ${orden.estado?.nombre || '-'}`, 56, 226);
    doc.text(`Metodo de pago: ${orden.metodo_pago?.nombre || 'No especificado'}`, 56, 242);
    doc.text(`Metodo de envio: ${orden.metodo_envio?.nombre || 'No especificado'}`, 56, 258);
    doc.text(`Items: ${orden.items.length}`, 56, 274);

    doc.roundedRect(40, 328, 515, 64, 10).fill('#0f172a');
    doc.fillColor('#cbd5e1').fontSize(11).text('Monto total pagado', 56, 347);
    doc.fillColor('#ffffff').fontSize(26).text(this.money(orden.total), 56, 358);

    const quickRows = orden.items.slice(0, 4).map((item) => ({
      nombre: item.producto?.nombre || 'Producto',
      cantidad: Number(item.cantidad || 0),
      precio: Number(item.precio_unitario || 0),
      subtotal: Number(item.subtotal || 0),
    }));

    doc.fillColor('#0f172a').fontSize(12).text('Items destacados', 40, 420);
    this.drawItemsTable(doc, quickRows, 438);

    doc.fillColor('#94a3b8').fontSize(9).text('Este comprobante valida la compra realizada en Commerce Suite.', 40, 780, {
      width: 515,
      align: 'center',
    });
    doc.end();
  }

  private async getOrdenWithAuth(req: AuthRequest, id: number) {
    const userId = req.user!.id;
    const userRol = (req.user!.rol || '').toUpperCase();
    const orden = await prisma.ord_ordenes.findUnique({
      where: { id },
      include: {
        items: { include: { producto: true, variante: true } },
        direccion: true,
        metodo_envio: true,
        metodo_pago: true,
        estado: true,
        pagos: true,
        cliente: true,
        ord_historial_estados: { include: { ord_estados_orden: true }, orderBy: { fecha: 'asc' } },
      },
    });

    if (!orden) return { error: 'Orden no encontrada', status: 404 } as const;

    const staffRoles = ['ADMIN', 'GERENTE_VENTAS', 'GERENTE_INVENTARIO', 'VENDEDOR'];
    if (!staffRoles.includes(userRol)) {
      const cliente = await this.findClienteByUserId(userId);
      if (!cliente || orden.id_cliente !== cliente.id) return { error: 'Sin permisos para ver esta orden', status: 403 } as const;
    }

    return orden;
  }

  async getMisOrdenes(req: AuthRequest, res: Response) {
    const userId = req.user!.id;
    const cliente = await this.findClienteByUserId(userId);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

    const estado = req.query.estado as string | undefined;
    const fechaDesde = req.query.fechaDesde as string | undefined;
    const fechaHasta = req.query.fechaHasta as string | undefined;

    const ordenes = await prisma.ord_ordenes.findMany({
      where: {
        id_cliente: cliente.id,
        ...(estado ? { estado: { nombre: estado } } : {}),
        ...(fechaDesde || fechaHasta
          ? {
              fecha: {
                ...(fechaDesde ? { gte: new Date(fechaDesde) } : {}),
                ...(fechaHasta ? { lte: new Date(fechaHasta) } : {}),
              },
            }
          : {}),
      },
      include: {
        items: { include: { producto: true, variante: true } },
        estado: true,
        direccion: true,
        metodo_pago: true,
        metodo_envio: true,
      },
      orderBy: { fecha: 'desc' },
    });

    return res.json(ordenes);
  }

  async getOrdenById(req: AuthRequest, res: Response) {
    const id = parseInt(req.params.id);
    const userId = req.user!.id;
    const userRol = (req.user!.rol || '').toUpperCase();

    const orden = await prisma.ord_ordenes.findUnique({
      where: { id },
      include: {
        items: { include: { producto: true, variante: true } },
        direccion: true,
        metodo_envio: true,
        metodo_pago: true,
        estado: true,
        pagos: true,
        ord_historial_estados: { include: { ord_estados_orden: true }, orderBy: { fecha: 'asc' } },
      },
    });

    if (!orden) return res.status(404).json({ error: 'Orden no encontrada' });

    const staffRoles = ['ADMIN', 'GERENTE_VENTAS', 'GERENTE_INVENTARIO', 'VENDEDOR'];
    if (!staffRoles.includes(userRol)) {
      const cliente = await this.findClienteByUserId(userId);
      if (!cliente || orden.id_cliente !== cliente.id) return res.status(403).json({ error: 'Sin permisos para ver esta orden' });
    }

    return res.json(orden);
  }

  async cancelarOrden(req: AuthRequest, res: Response) {
    const id = parseInt(req.params.id);
    const userId = req.user!.id;

    const cliente = await this.findClienteByUserId(userId);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

    const orden = await prisma.ord_ordenes.findUnique({ where: { id }, include: { estado: true } });
    if (!orden || orden.id_cliente !== cliente.id) return res.status(404).json({ error: 'Orden no encontrada' });

    const estadosNoCancelables = ['enviada', 'entregada', 'devuelta', 'cancelada'];
    if (estadosNoCancelables.includes((orden.estado?.nombre || '').toLowerCase())) {
      return res.status(400).json({ error: 'La orden ya no puede cancelarse por estado actual' });
    }

    const fechaOrden = orden.fecha ? new Date(orden.fecha) : new Date();
    const elapsedMinutes = (Date.now() - fechaOrden.getTime()) / 60000;
    if (elapsedMinutes > 120) {
      return res.status(400).json({ error: 'Ventana de cancelacion expirada (120 min)' });
    }

    const estadoCancelada = await this.findEstado('cancelada');
    if (!estadoCancelada) return res.status(500).json({ error: 'Estado cancelada no configurado' });

    await prisma.ord_ordenes.update({ where: { id }, data: { id_estado: estadoCancelada.id } });
    await this.pushHistorial(id, estadoCancelada.id, userId, 'Cancelacion solicitada por cliente');

    return res.json({ message: 'Orden cancelada correctamente' });
  }

  // Admin: listar todas las órdenes
  async listAll(req: Request, res: Response) {
    const estado = req.query.estado as string | undefined;
    const fechaDesde = req.query.fechaDesde as string | undefined;
    const fechaHasta = req.query.fechaHasta as string | undefined;
    const cliente = req.query.cliente as string | undefined;
    const montoMin = req.query.montoMin ? Number(req.query.montoMin) : undefined;
    const montoMax = req.query.montoMax ? Number(req.query.montoMax) : undefined;

    const ordenes = await prisma.ord_ordenes.findMany({
      where: {
        ...(estado ? { estado: { nombre: estado } } : {}),
        ...(cliente
          ? {
              cliente: {
                OR: [
                  { email: { contains: cliente, mode: 'insensitive' } },
                  { nombre: { contains: cliente, mode: 'insensitive' } },
                ],
              },
            }
          : {}),
        ...(fechaDesde || fechaHasta
          ? {
              fecha: {
                ...(fechaDesde ? { gte: new Date(fechaDesde) } : {}),
                ...(fechaHasta ? { lte: new Date(fechaHasta) } : {}),
              },
            }
          : {}),
        ...(montoMin !== undefined || montoMax !== undefined
          ? {
              total: {
                ...(montoMin !== undefined ? { gte: montoMin } : {}),
                ...(montoMax !== undefined ? { lte: montoMax } : {}),
              },
            }
          : {}),
      },
      include: { cliente: true, estado: true, metodo_pago: true, metodo_envio: true },
      orderBy: { fecha: 'desc' },
    });

    return res.json(ordenes);
  }

  async updateEstado(req: AuthRequest, res: Response) {
    const id = parseInt(req.params.id);
    const { id_estado, estado, comentario } = req.body;
    const role = (req.user?.rol || '').toUpperCase();

    let estadoEntity = null;
    if (id_estado) {
      estadoEntity = await prisma.ord_estados_orden.findUnique({ where: { id: Number(id_estado) } });
    } else if (estado) {
      estadoEntity = await prisma.ord_estados_orden.findFirst({ where: { nombre: estado } });
    }

    if (!estadoEntity) return res.status(400).json({ error: 'Estado invalido' });

    if (role === 'VENDEDOR') {
      const allowedBasicStates = ['en_proceso', 'enviada'];
      if (!allowedBasicStates.includes((estadoEntity.nombre || '').toLowerCase())) {
        return res.status(403).json({ error: 'Vendedor solo puede cambiar a en_proceso o enviada' });
      }
    }

    await prisma.ord_ordenes.update({ where: { id }, data: { id_estado: estadoEntity.id } });
    await this.pushHistorial(id, estadoEntity.id, req.user?.id, comentario || 'Cambio de estado por admin');

    return res.json({ message: 'Estado actualizado', estado: estadoEntity.nombre });
  }

  async registrarDevolucion(req: AuthRequest, res: Response) {
    const id = parseInt(req.params.id);
    const { motivo, montoReembolsado, comentarioAdministrador } = req.body;

    const devolucion = await prisma.ord_devoluciones.create({
      data: {
        id_orden: id,
        motivo,
        estado: 'aprobada',
        monto_reembolsado: montoReembolsado,
        fecha_resolucion: new Date(),
        comentario_administrador: comentarioAdministrador,
      },
    });

    const estadoDevuelta = await this.findEstado('devuelta');
    if (estadoDevuelta) {
      await prisma.ord_ordenes.update({ where: { id }, data: { id_estado: estadoDevuelta.id } });
      await this.pushHistorial(id, estadoDevuelta.id, req.user?.id, 'Devolucion registrada');
    }

    return res.status(201).json(devolucion);
  }
}
