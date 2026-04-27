import { Request, Response } from 'express';
import prisma from '../lib/prisma';

const IMPUESTO_KEY = 'impuesto_general';
const ENVIO_GRATIS_KEY = 'envio_gratis_desde';

const parseConfigNumber = (raw: string | null | undefined, fallback: number) => {
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
};

export class ConfiguracionController {
  private async getPurchaseConfig() {
    const [impuestoRow, envioGratisRow] = await Promise.all([
      prisma.configuracion_sistema.findUnique({ where: { clave: IMPUESTO_KEY } }),
      prisma.configuracion_sistema.findUnique({ where: { clave: ENVIO_GRATIS_KEY } }),
    ]);

    return {
      impuesto_porcentaje: parseConfigNumber(impuestoRow?.valor, 18),
      envio_gratis_desde: parseConfigNumber(envioGratisRow?.valor, 250),
    };
  }

  async getPublic(req: Request, res: Response) {
    const config = await this.getPurchaseConfig();
    return res.json(config);
  }

  async getAdmin(req: Request, res: Response) {
    const config = await this.getPurchaseConfig();
    return res.json(config);
  }

  async updateAdmin(req: Request, res: Response) {
    const impuesto = Number(req.body?.impuesto_porcentaje);
    const envioGratisDesde = Number(req.body?.envio_gratis_desde);

    if (!Number.isFinite(impuesto) || impuesto < 0) {
      return res.status(400).json({ error: 'impuesto_porcentaje debe ser un numero mayor o igual a 0' });
    }
    if (!Number.isFinite(envioGratisDesde) || envioGratisDesde < 0) {
      return res.status(400).json({ error: 'envio_gratis_desde debe ser un numero mayor o igual a 0' });
    }

    await prisma.$transaction([
      prisma.configuracion_sistema.upsert({
        where: { clave: IMPUESTO_KEY },
        update: {
          valor: String(impuesto),
          descripcion: 'Porcentaje de impuesto (IGV) para calculo de compra',
        },
        create: {
          clave: IMPUESTO_KEY,
          valor: String(impuesto),
          descripcion: 'Porcentaje de impuesto (IGV) para calculo de compra',
        },
      }),
      prisma.configuracion_sistema.upsert({
        where: { clave: ENVIO_GRATIS_KEY },
        update: {
          valor: String(envioGratisDesde),
          descripcion: 'Monto minimo para envio gratis',
        },
        create: {
          clave: ENVIO_GRATIS_KEY,
          valor: String(envioGratisDesde),
          descripcion: 'Monto minimo para envio gratis',
        },
      }),
    ]);

    return res.json({
      message: 'Configuracion de compra actualizada',
      data: {
        impuesto_porcentaje: impuesto,
        envio_gratis_desde: envioGratisDesde,
      },
    });
  }
}
