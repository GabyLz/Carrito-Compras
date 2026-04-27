import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export class ClienteController {
  private async getClienteFromUser(userId: number) {
    const usuario = await prisma.seg_usuarios.findUnique({ where: { id: userId }, include: { cliente: true } });
    if (!usuario?.cliente) return null;
    return usuario.cliente;
  }

  async getPerfil(req: AuthRequest, res: Response) {
    const userId = req.user!.id;
    const cliente = await this.getClienteFromUser(userId);
    if (!cliente) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(cliente);
  }

  async updatePerfil(req: AuthRequest, res: Response) {
    const userId = req.user!.id;
    const rawNombre = req.body?.nombre;
    const rawApellido = req.body?.apellido;
    const rawTelefono = req.body?.telefono;

    const nombre = typeof rawNombre === 'string' ? rawNombre.trim() : undefined;
    const apellido = typeof rawApellido === 'string' ? rawApellido.trim() : undefined;
    const telefono = typeof rawTelefono === 'string' ? rawTelefono.trim() : undefined;

    if (!nombre || nombre.length < 2 || nombre.length > 100) {
      return res.status(400).json({ error: 'nombre debe tener entre 2 y 100 caracteres' });
    }
    if (apellido !== undefined && apellido.length > 100) {
      return res.status(400).json({ error: 'apellido no debe exceder 100 caracteres' });
    }
    if (telefono !== undefined && telefono.length > 20) {
      return res.status(400).json({ error: 'telefono no debe exceder 20 caracteres' });
    }

    const cliente = await this.getClienteFromUser(userId);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

    const updated = await prisma.cli_clientes.update({
      where: { id: cliente.id },
      data: {
        nombre,
        apellido: apellido || '',
        telefono: telefono || null,
      },
    });

    res.json(updated);
  }

  async getDirecciones(req: AuthRequest, res: Response) {
    const userId = req.user!.id;
    const cliente = await this.getClienteFromUser(userId);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
    const direcciones = await prisma.cli_direcciones.findMany({ where: { id_cliente: cliente.id } });
    res.json(direcciones);
  }

  async createDireccion(req: AuthRequest, res: Response) {
    const userId = req.user!.id;
    const cliente = await this.getClienteFromUser(userId);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
    const data = { ...req.body, id_cliente: cliente.id };
    const direccion = await prisma.cli_direcciones.create({ data });
    res.status(201).json(direccion);
  }

  async getWishlist(req: AuthRequest, res: Response) {
    const cliente = await this.getClienteFromUser(req.user!.id);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

    let wishlist = await prisma.cli_lista_deseos.findUnique({ where: { id_cliente: cliente.id } });
    if (!wishlist) {
      wishlist = await prisma.cli_lista_deseos.create({ data: { id_cliente: cliente.id } });
    }

    const items = await prisma.cli_items_lista_deseos.findMany({
      where: { id_lista_deseos: wishlist.id },
      include: {
        cat_productos: { include: { imagenes: true, categoria: true, variantes: true } },
        cat_producto_variante: true,
      },
      orderBy: { agregado: 'desc' },
    });

    res.json({ data: items });
  }

  async addWishlist(req: AuthRequest, res: Response) {
    const cliente = await this.getClienteFromUser(req.user!.id);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

    const { id_producto, id_variante } = req.body;
    if (!id_producto) return res.status(400).json({ error: 'id_producto es requerido' });

    let wishlist = await prisma.cli_lista_deseos.findUnique({ where: { id_cliente: cliente.id } });
    if (!wishlist) {
      wishlist = await prisma.cli_lista_deseos.create({ data: { id_cliente: cliente.id } });
    }

    const existing = await prisma.cli_items_lista_deseos.findFirst({
      where: {
        id_lista_deseos: wishlist.id,
        id_producto: Number(id_producto),
        id_variante: id_variante ? Number(id_variante) : null,
      },
    });

    const item =
      existing ||
      (await prisma.cli_items_lista_deseos.create({
        data: {
          id_lista_deseos: wishlist.id,
          id_producto: Number(id_producto),
          id_variante: id_variante ? Number(id_variante) : null,
        },
      }));

    res.status(201).json(item);
  }

  async removeWishlist(req: AuthRequest, res: Response) {
    const cliente = await this.getClienteFromUser(req.user!.id);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

    const idProducto = Number(req.params.idProducto);
    const wishlist = await prisma.cli_lista_deseos.findUnique({ where: { id_cliente: cliente.id } });
    if (!wishlist) return res.status(404).json({ error: 'Lista de deseos no encontrada' });

    await prisma.cli_items_lista_deseos.deleteMany({
      where: { id_lista_deseos: wishlist.id, id_producto: idProducto },
    });

    res.json({ message: 'Eliminado de lista de deseos' });
  }

  async getMisResenas(req: AuthRequest, res: Response) {
    const cliente = await this.getClienteFromUser(req.user!.id);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

    const resenas = await prisma.cli_resenas_producto.findMany({
      where: { id_cliente: cliente.id },
      include: { producto: true, variante: true },
      orderBy: { fecha: 'desc' },
    });

    res.json(resenas);
  }

  async createResena(req: AuthRequest, res: Response) {
    const cliente = await this.getClienteFromUser(req.user!.id);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

    const { id_producto, id_variante, calificacion, comentario } = req.body;
    const created = await prisma.cli_resenas_producto.create({
      data: {
        id_cliente: cliente.id,
        id_producto: Number(id_producto),
        id_variante: id_variante ? Number(id_variante) : null,
        calificacion: Number(calificacion),
        comentario,
      },
    });

    res.status(201).json(created);
  }

  async getClientes(req: Request, res: Response) {
    try {
      const search = String(req.query.search || '').trim();
      const segmento = String(req.query.segmento || '').trim().toUpperCase();

      const clientes = await prisma.cli_clientes.findMany({
        where: {
          ...(search
            ? {
                OR: [
                  { nombre: { contains: search, mode: 'insensitive' } },
                  { apellido: { contains: search, mode: 'insensitive' } },
                  { email: { contains: search, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        include: {
          ordenes: {
            select: { id: true, total: true, fecha: true },
          },
          _count: {
            select: { ordenes: true }
          }
        }
      });

      const now = new Date();
      const enriched = clientes.map((c) => {
        const totalGastado = c.ordenes.reduce((acc, o) => acc + Number(o.total || 0), 0);
        const ultimaCompra = c.ordenes
          .map((o) => (o.fecha ? new Date(o.fecha).getTime() : 0))
          .sort((a, b) => b - a)[0];
        const diasSinCompra = ultimaCompra ? Math.floor((now.getTime() - ultimaCompra) / (1000 * 60 * 60 * 24)) : null;

        let segmentoCalculado = 'NUEVO';
        if ((c._count?.ordenes || 0) >= 10 || totalGastado >= 3000) segmentoCalculado = 'VIP';
        else if ((c._count?.ordenes || 0) >= 2) segmentoCalculado = 'RECURRENTE';
        if (diasSinCompra !== null && diasSinCompra > 120) segmentoCalculado = 'INACTIVO';

        return {
          ...c,
          totalGastado,
          ultimaCompra: ultimaCompra ? new Date(ultimaCompra).toISOString() : null,
          segmento: segmentoCalculado,
        };
      });

      const filtered = segmento ? enriched.filter((c) => c.segmento === segmento) : enriched;
      res.json(filtered);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}