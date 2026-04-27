import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export class CuponController {
  private parseDateInput(value: unknown) {
    if (value === null || value === undefined || value === '') return undefined;
    if (value instanceof Date) return value;
    if (typeof value === 'string') {
      const raw = value.trim();
      if (!raw) return undefined;
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const parsed = new Date(`${raw}T00:00:00.000Z`);
        if (!Number.isNaN(parsed.getTime())) return parsed;
      }
      const parsed = new Date(raw);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return undefined;
  }

  private buildCuponData(body: any) {
    const codigo = typeof body?.codigo === 'string' ? body.codigo.trim().toUpperCase() : undefined;
    const tipo = typeof body?.tipo === 'string' ? body.tipo.trim().toLowerCase() : undefined;
    const fecha_inicio = this.parseDateInput(body?.fecha_inicio);
    const fecha_fin = this.parseDateInput(body?.fecha_fin);

    return {
      ...(codigo ? { codigo } : {}),
      ...(tipo ? { tipo } : {}),
      ...(body?.valor !== undefined ? { valor: Number(body.valor) } : {}),
      ...(body?.monto_minimo !== undefined ? { monto_minimo: body.monto_minimo === null ? null : Number(body.monto_minimo) } : {}),
      ...(fecha_inicio ? { fecha_inicio } : {}),
      ...(fecha_fin ? { fecha_fin } : {}),
      ...(body?.usos_maximos !== undefined ? { usos_maximos: body.usos_maximos === null ? null : Number(body.usos_maximos) } : {}),
      ...(body?.usos_actuales !== undefined ? { usos_actuales: body.usos_actuales === null ? null : Number(body.usos_actuales) } : {}),
      ...(body?.activo !== undefined ? { activo: Boolean(body.activo) } : {}),
    };
  }

  async list(req: Request, res: Response) {
    const cupones = await prisma.ord_cupones.findMany();
    res.json(cupones);
  }
  async create(req: Request, res: Response) {
    const data = this.buildCuponData(req.body);
    if (!data.codigo || !data.tipo || data.valor === undefined || !data.fecha_inicio || !data.fecha_fin) {
      return res.status(400).json({ error: 'Faltan campos requeridos para crear el cupón' });
    }

    const cupon = await prisma.ord_cupones.create({
      data: {
        codigo: data.codigo,
        tipo: data.tipo,
        valor: data.valor,
        monto_minimo: data.monto_minimo ?? null,
        fecha_inicio: data.fecha_inicio,
        fecha_fin: data.fecha_fin,
        usos_maximos: data.usos_maximos ?? null,
        usos_actuales: data.usos_actuales ?? 0,
        activo: data.activo ?? true,
      },
    });
    res.status(201).json(cupon);
  }
  async update(req: Request, res: Response) {
    const { id } = req.params;
    const cupon = await prisma.ord_cupones.update({ where: { id: parseInt(id) }, data: this.buildCuponData(req.body) });
    res.json(cupon);
  }
  async delete(req: Request, res: Response) {
    await prisma.ord_cupones.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Eliminado' });
  }
  async validar(req: Request, res: Response) {
    const codigo = typeof req.body?.codigo === 'string' ? req.body.codigo.trim().toUpperCase() : '';
    const subtotal = Number(req.body?.subtotal || 0);
    const cupon = await prisma.ord_cupones.findFirst({
      where: {
        codigo,
        fecha_inicio: { lte: new Date() },
        fecha_fin: { gte: new Date() },
        activo: true,
      }
    });
    if (!cupon) return res.status(404).json({ error: 'Cupón inválido' });
    const usosMaximos = cupon.usos_maximos === null || cupon.usos_maximos === undefined ? null : Number(cupon.usos_maximos);
    const usosActuales = cupon.usos_actuales === null || cupon.usos_actuales === undefined ? 0 : Number(cupon.usos_actuales);
    if (usosMaximos !== null && usosActuales >= usosMaximos) {
      return res.status(400).json({ error: 'Cupón sin usos disponibles' });
    }
    const montoMinimo = cupon.monto_minimo ? Number(cupon.monto_minimo) : 0;
    if (subtotal < montoMinimo) return res.status(400).json({ error: `Mínimo $${montoMinimo}` });
    let descuento = 0;
    const valor = Number(cupon.valor);
    if (cupon.tipo === 'porcentaje') descuento = subtotal * (valor / 100);
    else descuento = valor;
    res.json({ descuento, cupon });
  }
}
