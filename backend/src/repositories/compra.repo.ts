import prisma from '../lib/prisma';

export class CompraRepository {
  async findAll() {
    return prisma.inv_ordenes_compra.findMany({
      include: {
        proveedor: true,
        almacen: true,
        detalles: {
          include: {
            producto: true,
            variante: true,
          },
        },
      },
      orderBy: { fecha_pedido: 'desc' },
    });
  }

  async findById(id: number) {
    return prisma.inv_ordenes_compra.findUnique({
      where: { id },
      include: {
        proveedor: true,
        almacen: true,
        detalles: {
          include: {
            producto: true,
            variante: true,
          },
        },
        inv_recepciones: true,
        cuenta_por_pagar: true as any,
      },
    });
  }

  async create(data: any) {
    const { detalles, ...orderData } = data;
    return prisma.inv_ordenes_compra.create({
      data: {
        ...orderData,
        detalles: {
          create: detalles,
        },
      },
      include: {
        detalles: true,
      },
    });
  }

  async update(id: number, data: any) {
    const { detalles, ...orderData } = data;
    
    // If details are provided, we might need a more complex update logic
    // For now, let's just update the main order data
    return prisma.inv_ordenes_compra.update({
      where: { id },
      data: orderData,
      include: {
        detalles: true,
      },
    });
  }

  async updateStatus(id: number, estado: string) {
    return prisma.inv_ordenes_compra.update({
      where: { id },
      data: { estado },
    });
  }
}
