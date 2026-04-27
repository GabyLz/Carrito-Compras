import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export class CarritoController {
  private async resolveCliente(userId: number) {
    return prisma.cli_clientes.findFirst({ where: { usuario: { id: userId } } });
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

  private async validarCantidadDisponible(idProducto: number, cantidad: number, idVariante?: number | null) {
    const stock = await this.resolveStockDisponible(idProducto, idVariante);
    if (!stock) return { ok: false, status: 404, error: 'Producto no encontrado' };

    const stockDisponible = Math.max(Number(stock.stockDisponible || 0), 0);
    if (stockDisponible <= 0) {
      return { ok: false, status: 400, error: `${stock.producto.nombre} no tiene stock disponible.` };
    }

    if (cantidad > stockDisponible) {
      return {
        ok: false,
        status: 400,
        error: `${stock.producto.nombre}: solo hay ${stockDisponible} unidad(es) disponibles.`,
      };
    }

    return { ok: true, stockDisponible };
  }

  private async resolveCarritoByUser(userId: number) {
    const cliente = await this.resolveCliente(userId);
    if (!cliente) return null;

    let carrito = await prisma.ord_carritos.findUnique({
      where: { id_cliente: cliente.id },
      include: { items: { include: { producto: true, variante: true } } },
    });

    if (!carrito) {
      carrito = await prisma.ord_carritos.create({
        data: { id_cliente: cliente.id },
        include: { items: { include: { producto: true, variante: true } } },
      });
    }

    return carrito;
  }

  private async buildResumen(carritoId: number, couponCode?: string, metodoEnvioId?: number) {
    const carrito = await prisma.ord_carritos.findUnique({
      where: { id: carritoId },
      include: { items: { include: { producto: true, variante: true } } },
    });

    if (!carrito) {
      return {
        items: [],
        alerts: [],
        subtotal: 0,
        impuestoPorcentaje: 0,
        impuesto: 0,
        descuento: 0,
        envio: 0,
        total: 0,
        cupon: null,
      };
    }

    const alerts: Array<{ id_item: number; tipo: 'stock' | 'precio'; mensaje: string }> = [];

    let subtotal = 0;
    for (const item of carrito.items) {
      const precioActual = Number(item.producto.precio_venta);
      subtotal += precioActual * item.cantidad;

      const stockDisponible = Number(item.variante?.stock ?? item.producto.stock_general ?? 0);

      if (item.cantidad > stockDisponible) {
        alerts.push({
          id_item: item.id,
          tipo: 'stock',
          mensaje: `${item.producto.nombre}: stock insuficiente (${stockDisponible} disponible).`,
        });
      }

      const precioCliente = Number(item.variante?.precio_ajuste || 0) + precioActual;
      if (precioCliente !== precioActual) {
        alerts.push({
          id_item: item.id,
          tipo: 'precio',
          mensaje: `${item.producto.nombre}: el precio fue actualizado.`,
        });
      }
    }

    const [configImpuesto, configEnvioGratis] = await Promise.all([
      prisma.configuracion_sistema.findUnique({ where: { clave: 'impuesto_general' } }),
      prisma.configuracion_sistema.findUnique({ where: { clave: 'envio_gratis_desde' } }),
    ]);
    const impuestoPorcentaje = Number(configImpuesto?.valor || 18);
    const envioGratisDesde = Number(configEnvioGratis?.valor || 250);

    let descuento = 0;
    let cuponAplicado: any = null;
    if (couponCode) {
      const codigo = couponCode.trim().toUpperCase();
      const ahora = new Date();
      const cupon = await prisma.ord_cupones.findFirst({
        where: {
          codigo,
          activo: true,
          fecha_inicio: { lte: ahora },
          fecha_fin: { gte: ahora },
        },
      });

      if (cupon) {
        const usosActuales = Number(cupon.usos_actuales || 0);
        const usosMaximos = cupon.usos_maximos === null ? null : Number(cupon.usos_maximos);
        const disponible = usosMaximos === null ? true : usosActuales < usosMaximos;
        const montoMinimo = Number(cupon.monto_minimo || 0);
        if (disponible && subtotal >= montoMinimo) {
          const valor = Number(cupon.valor);
          descuento = cupon.tipo === 'porcentaje' ? subtotal * (valor / 100) : valor;
          cuponAplicado = cupon;
        }
      }
    }

    let envioBase = 18;
    if (typeof metodoEnvioId === 'number' && Number.isFinite(metodoEnvioId)) {
      const metodo = await prisma.ord_metodos_envio.findUnique({ where: { id: metodoEnvioId } });
      if (metodo) envioBase = Number(metodo.costo);
    }
    const envio = subtotal >= envioGratisDesde ? 0 : Number(envioBase.toFixed(2));

    const baseImponible = Number(Math.max(subtotal - descuento, 0).toFixed(2));
    const impuesto = Number((baseImponible * (impuestoPorcentaje / 100)).toFixed(2));
    const total = Number((baseImponible + impuesto + envio).toFixed(2));

    return {
      items: carrito.items,
      alerts,
      subtotal: Number(subtotal.toFixed(2)),
      impuestoPorcentaje,
      impuesto,
      descuento: Number(descuento.toFixed(2)),
      envio,
      total,
      cupon: cuponAplicado,
    };
  }

  async getCarrito(req: AuthRequest, res: Response) {
    const userId = req.user!.id;
    const cliente = await this.resolveCliente(userId);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

    const carrito = await this.resolveCarritoByUser(userId);
    if (!carrito) return res.status(404).json({ error: 'Carrito no disponible' });

    res.json(carrito);
  }

  async addItem(req: AuthRequest, res: Response) {
    const userId = req.user!.id;
    const idProducto = Number(req.body?.id_producto);
    const cantidad = Math.max(Number(req.body?.cantidad || 1), 1);
    const idVariante = req.body?.id_variante !== undefined && req.body?.id_variante !== null ? Number(req.body.id_variante) : null;
    const cliente = await this.resolveCliente(userId);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

    const stockValido = await this.validarCantidadDisponible(idProducto, cantidad, idVariante);
    if (!stockValido.ok) return res.status(stockValido.status).json({ error: stockValido.error });

    let carrito = await prisma.ord_carritos.findUnique({ where: { id_cliente: cliente.id } });
    if (!carrito) {
      carrito = await prisma.ord_carritos.create({ data: { id_cliente: cliente.id } });
    }
    const existing = await prisma.ord_items_carrito.findFirst({
      where: { id_carrito: carrito.id, id_producto: idProducto, id_variante: idVariante }
    });
    const cantidadFinal = existing ? existing.cantidad + cantidad : cantidad;
    if (cantidadFinal > Number(stockValido.stockDisponible || 0)) {
      return res.status(400).json({ error: `Solo hay ${stockValido.stockDisponible} unidad(es) disponibles.` });
    }
    if (existing) {
      await prisma.ord_items_carrito.update({
        where: { id: existing.id },
        data: { cantidad: cantidadFinal }
      });
    } else {
      await prisma.ord_items_carrito.create({
        data: { id_carrito: carrito.id, id_producto: idProducto, id_variante: idVariante, cantidad }
      });
    }
    res.json({ message: 'Producto agregado al carrito' });
  }

  async updateItem(req: AuthRequest, res: Response) {
    const { itemId } = req.params;
    const cantidad = Math.max(Number(req.body?.cantidad || 1), 1);
    const userId = req.user!.id;
    const carrito = await this.resolveCarritoByUser(userId);
    if (!carrito) return res.status(404).json({ error: 'Carrito no encontrado' });

    const item = await prisma.ord_items_carrito.findUnique({ where: { id: parseInt(itemId) } });
    if (!item || item.id_carrito !== carrito.id) {
      return res.status(403).json({ error: 'No autorizado para modificar este item' });
    }

    const stockValido = await this.validarCantidadDisponible(item.id_producto, cantidad, item.id_variante);
    if (!stockValido.ok) return res.status(stockValido.status).json({ error: stockValido.error });

    await prisma.ord_items_carrito.update({
      where: { id: parseInt(itemId) },
      data: { cantidad }
    });
    res.json({ message: 'Cantidad actualizada' });
  }

  async removeItem(req: AuthRequest, res: Response) {
    const { itemId } = req.params;
    const userId = req.user!.id;
    const carrito = await this.resolveCarritoByUser(userId);
    if (!carrito) return res.status(404).json({ error: 'Carrito no encontrado' });

    const item = await prisma.ord_items_carrito.findUnique({ where: { id: parseInt(itemId) } });
    if (!item || item.id_carrito !== carrito.id) {
      return res.status(403).json({ error: 'No autorizado para eliminar este item' });
    }

    await prisma.ord_items_carrito.delete({ where: { id: parseInt(itemId) } });
    res.json({ message: 'Item eliminado' });
  }

  async clearCarrito(req: AuthRequest, res: Response) {
    const userId = req.user!.id;
    const cliente = await prisma.cli_clientes.findFirst({ where: { usuario: { id: userId } } });
    if (cliente) {
      await prisma.ord_items_carrito.deleteMany({ where: { carrito: { id_cliente: cliente.id } } });
    }
    res.json({ message: 'Carrito vaciado' });
  }

  async syncLocal(req: AuthRequest, res: Response) {
    const userId = req.user!.id;
    const carrito = await this.resolveCarritoByUser(userId);
    if (!carrito) return res.status(404).json({ error: 'Carrito no encontrado' });

    const localItems: Array<{ id_producto: number; id_variante?: number; cantidad: number }> = Array.isArray(req.body?.items)
      ? req.body.items
      : [];

    for (const it of localItems) {
      const cantidad = Math.max(Number(it.cantidad || 1), 1);
      const idProducto = Number(it.id_producto);
      const idVariante = it.id_variante !== undefined && it.id_variante !== null ? Number(it.id_variante) : null;
      const stockValido = await this.validarCantidadDisponible(idProducto, cantidad, idVariante);
      if (!stockValido.ok) return res.status(stockValido.status).json({ error: stockValido.error });

      const existing = await prisma.ord_items_carrito.findFirst({
        where: {
          id_carrito: carrito.id,
          id_producto: idProducto,
          id_variante: idVariante,
        },
      });

      if (existing) {
        await prisma.ord_items_carrito.update({
          where: { id: existing.id },
          data: { cantidad },
        });
      } else {
        await prisma.ord_items_carrito.create({
          data: {
            id_carrito: carrito.id,
            id_producto: idProducto,
            id_variante: idVariante,
            cantidad,
          },
        });
      }
    }

    const merged = await prisma.ord_carritos.findUnique({
      where: { id: carrito.id },
      include: { items: { include: { producto: true, variante: true } } },
    });

    res.json({ message: 'Carrito sincronizado', carrito: merged });
  }

  async getResumen(req: AuthRequest, res: Response) {
    const carrito = await this.resolveCarritoByUser(req.user!.id);
    if (!carrito) return res.status(404).json({ error: 'Carrito no encontrado' });

    const code = (req.query.cupon as string) || undefined;
    const metodoEnvioId = req.query.metodoEnvioId ? Number(req.query.metodoEnvioId) : undefined;
    const resumen = await this.buildResumen(carrito.id, code, metodoEnvioId);
    res.json(resumen);
  }

  async applyCupon(req: AuthRequest, res: Response) {
    const carrito = await this.resolveCarritoByUser(req.user!.id);
    if (!carrito) return res.status(404).json({ error: 'Carrito no encontrado' });

    const codigo = typeof req.body?.codigo === 'string' ? req.body.codigo.trim().toUpperCase() : '';
    if (!codigo) return res.status(400).json({ error: 'codigo es requerido' });

    const resumen = await this.buildResumen(carrito.id, codigo);
    if (!resumen.cupon) {
      return res.status(400).json({ error: 'Cupon invalido o no aplicable' });
    }

    res.json(resumen);
  }
}
