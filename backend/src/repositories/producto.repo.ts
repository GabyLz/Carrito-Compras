import prisma from '../lib/prisma';

export class ProductoRepository {
  private buildProductoData(data: any) {
    const { id_categoria, id_marca, imagen_url, ...base } = data || {};

    const mapped: any = { ...base };

    if (id_categoria !== undefined) {
      mapped.categoria = id_categoria === null ? { disconnect: true } : { connect: { id: Number(id_categoria) } };
    }

    if (id_marca !== undefined) {
      mapped.marca = id_marca === null ? { disconnect: true } : { connect: { id: Number(id_marca) } };
    }

    if (typeof imagen_url === 'string' && imagen_url.trim()) {
      mapped.imagenes = {
        create: [{ url: imagen_url.trim(), orden: 0 }],
      };
    }

    return mapped;
  }

  async findAll(page: number, limit: number, filters: any) {
    const skip = (page - 1) * limit;
    const where: any = { estado_producto: 'activo' };
    if (filters.search && filters.search.trim()) {
      const search = filters.search.trim();
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { descripcion_corta: { contains: search, mode: 'insensitive' } },
        { descripcion_larga: { contains: search, mode: 'insensitive' } },
        { categoria: { nombre: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (filters.categoriaId) where.id_categoria = filters.categoriaId;
    if (filters.marcaId) where.id_marca = filters.marcaId;
    if (filters.minPrice) where.precio_venta = { gte: filters.minPrice };
    if (filters.maxPrice) where.precio_venta = { ...where.precio_venta, lte: filters.maxPrice };

    const orderBy: any = (() => {
      switch (filters.sortBy) {
        case 'nombre_asc':
          return { nombre: 'asc' };
        case 'precio_asc':
          return { precio_venta: 'asc' };
        case 'precio_desc':
          return { precio_venta: 'desc' };
        case 'popularidad':
          return null;
        default:
          return { created_at: 'desc' };
      }
    })();

    const [allData, total] = await Promise.all([
      prisma.cat_productos.findMany({
        where,
        include: { marca: true, categoria: true, variantes: true, imagenes: true, _count: { select: { items_orden: true, resenas: true } } },
        orderBy: orderBy || undefined,
      }),
      prisma.cat_productos.count({ where }),
    ]);

    const sorted = filters.sortBy === 'popularidad'
      ? [...allData].sort((a: any, b: any) => Number(b._count?.items_orden || 0) - Number(a._count?.items_orden || 0))
      : allData;

    const data = sorted.slice(skip, skip + limit);
    return { data, total };
  }

  async findById(id: number) {
    return prisma.cat_productos.findUnique({
      where: { id },
      include: { 
        marca: true, 
        imagenes: true, 
        categoria: true,
        variantes: { where: { activo: true } }, 
        etiquetas: { include: { etiqueta: true } },
        resenas: { include: { cliente: true }, orderBy: { fecha: 'desc' } },
      },
    });
  }

  async findRelatedByCategory(idCategoria: number, excludeId: number) {
    return prisma.cat_productos.findMany({
      where: { estado_producto: 'activo', id_categoria: idCategoria, NOT: { id: excludeId } },
      include: { marca: true, categoria: true, imagenes: true },
      take: 4,
      orderBy: { created_at: 'desc' },
    });
  }

  async findCategorias() {
    return prisma.cat_categorias.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async findMarcas() {
    return prisma.cat_marcas.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async createCategoria(data: { nombre: string; descripcion?: string | null }) {
    return prisma.cat_categorias.create({
      data: {
        nombre: data.nombre.trim(),
        descripcion: data.descripcion ?? null,
        activo: true,
      },
    });
  }

  async updateCategoria(id: number, data: { nombre?: string; descripcion?: string | null }) {
    return prisma.cat_categorias.update({
      where: { id },
      data: {
        ...(data.nombre ? { nombre: data.nombre.trim() } : {}),
        ...(data.descripcion !== undefined ? { descripcion: data.descripcion } : {}),
      },
    });
  }

  async deleteCategoria(id: number) {
    return prisma.cat_categorias.update({ where: { id }, data: { activo: false } });
  }

  async createMarca(data: { nombre: string; logo_url?: string | null }) {
    return prisma.cat_marcas.create({
      data: {
        nombre: data.nombre.trim(),
        logo_url: data.logo_url ?? null,
        activo: true,
      },
    });
  }

  async updateMarca(id: number, data: { nombre?: string; logo_url?: string | null }) {
    return prisma.cat_marcas.update({
      where: { id },
      data: {
        ...(data.nombre ? { nombre: data.nombre.trim() } : {}),
        ...(data.logo_url !== undefined ? { logo_url: data.logo_url } : {}),
      },
    });
  }

  async deleteMarca(id: number) {
    return prisma.cat_marcas.update({ where: { id }, data: { activo: false } });
  }

  async create(data: any) {
    const mapped = this.buildProductoData(data);
    return prisma.cat_productos.create({ data: mapped });
  }

  async update(id: number, data: any) {
    const { imagen_url, ...rest } = data || {};
    const mapped = this.buildProductoData(rest);

    if (typeof imagen_url === 'string' && imagen_url.trim()) {
      return prisma.$transaction(async (tx) => {
        await tx.cat_productos.update({ where: { id }, data: mapped });

        const existingImage = await tx.cat_imagenes_producto.findFirst({
          where: { id_producto: id, orden: 0 },
          select: { id: true },
        });

        if (existingImage) {
          await tx.cat_imagenes_producto.update({
            where: { id: existingImage.id },
            data: { url: imagen_url.trim() },
          });
        } else {
          await tx.cat_imagenes_producto.create({
            data: { id_producto: id, url: imagen_url.trim(), orden: 0 },
          });
        }

        return tx.cat_productos.findUnique({
          where: { id },
          include: { marca: true, categoria: true, variantes: true, imagenes: true, _count: { select: { items_orden: true, resenas: true } } },
        });
      });
    }

    return prisma.cat_productos.update({ where: { id }, data: mapped });
  }

  async delete(id: number) {
    return prisma.cat_productos.update({ where: { id }, data: { estado_producto: 'inactivo' } });
  }
}
