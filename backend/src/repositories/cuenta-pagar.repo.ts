import prisma from '../lib/prisma';

export class CuentaPagarRepository {
  async findAll() {
    return prisma.inv_cuentas_por_pagar.findMany({
      include: {
        proveedor: true,
        orden_compra: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findById(id: number) {
    return prisma.inv_cuentas_por_pagar.findUnique({
      where: { id },
      include: {
        proveedor: true,
        orden_compra: true,
      },
    });
  }

  async update(id: number, data: any) {
    return prisma.inv_cuentas_por_pagar.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return prisma.inv_cuentas_por_pagar.delete({
      where: { id },
    });
  }
}
