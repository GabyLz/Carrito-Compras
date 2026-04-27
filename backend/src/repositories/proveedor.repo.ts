import prisma from '../lib/prisma';

export class ProveedorRepository {
  async findAll() {
    return prisma.inv_proveedores.findMany({
      orderBy: { nombre: 'asc' },
    });
  }

  async findById(id: number) {
    return prisma.inv_proveedores.findUnique({
      where: { id },
      include: {
        ordenes_compra: true,
        cuentas_por_pagar: true,
      },
    });
  }

  async create(data: any) {
    return prisma.inv_proveedores.create({
      data,
    });
  }

  async update(id: number, data: any) {
    return prisma.inv_proveedores.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return prisma.inv_proveedores.delete({
      where: { id },
    });
  }
}
