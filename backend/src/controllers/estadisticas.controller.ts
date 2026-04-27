import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class EstadisticasController {
  // Tendencia de ventas mensuales con promedio móvil
  async tendenciaVentas(req: Request, res: Response) {
    try {
      const { meses = 12 } = req.query;
      // Consulta SQL raw para obtener ventas por mes
      const ventas: any = await prisma.$queryRaw`
        SELECT DATE_TRUNC('month', fecha) as mes, SUM(total) as total
        FROM ord_ordenes
        WHERE id_estado IN (SELECT id FROM ord_estados_orden WHERE nombre IN ('pagada','pagado','entregada','entregado'))
        GROUP BY mes ORDER BY mes ASC LIMIT ${parseInt(meses as string)}
      `;
      // Calcular promedio móvil de 3 meses
      const normalized = ventas.map((v: any) => {
        const total = Number(v.total?.toString?.() ?? v.total ?? 0);
        return { mes: v.mes, total: Number.isFinite(total) ? total : 0 };
      });
      const resultados = normalized.map((v: any, i: number, arr: any[]) => {
        const movil = i < 2 ? null : Number(((arr[i - 2].total + arr[i - 1].total + v.total) / 3).toFixed(2));
        return { mes: v.mes, total: Number(v.total.toFixed(2)), movil };
      });
      res.json(resultados);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  // Análisis ABC
  async abcProductos(req: Request, res: Response) {
    try {
      const productos: any = await prisma.$queryRaw`
        SELECT p.id, p.nombre, SUM(io.cantidad * io.precio_unitario) as ingreso
        FROM ord_items_orden io
        JOIN cat_productos p ON io.id_producto = p.id
        GROUP BY p.id
        ORDER BY ingreso DESC
      `;
      const toNumber = (v: any) => {
        const n = Number(v?.toString?.() ?? v ?? 0);
        return Number.isFinite(n) ? n : 0;
      };
      const total = productos.reduce((sum: number, p: any) => sum + toNumber(p.ingreso), 0);
      let acum = 0;
      const abc = productos.map((p: any) => {
        acum += toNumber(p.ingreso);
        const porcentaje = acum / total;
        let categoria = 'C';
        if (porcentaje <= 0.8) categoria = 'A';
        else if (porcentaje <= 0.95) categoria = 'B';
        return { ...p, ingreso: toNumber(p.ingreso), acumulado: porcentaje, categoria };
      });
      res.json(abc);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  // RFM (solo ejemplo de endpoint)
  async rfmClientes(req: Request, res: Response) {
    try {
      const { limit = 500, meses = 24 } = req.query;
      const clientes: any = await prisma.$queryRaw`
        WITH ordenes AS (
          SELECT
            o.id_cliente,
            MAX(o.fecha) AS ultima_compra,
            COUNT(o.id)::int AS frecuencia,
            COALESCE(SUM(o.total), 0)::float AS monetario
          FROM ord_ordenes o
          WHERE o.id_estado IN (SELECT id FROM ord_estados_orden WHERE nombre IN ('pagada','pagado','entregada','entregado'))
            AND o.fecha >= (NOW() - (${parseInt(meses as string)}) * INTERVAL '1 month')
          GROUP BY o.id_cliente
        )
        SELECT
          c.id,
          c.nombre,
          o.ultima_compra,
          COALESCE(o.frecuencia, 0)::int AS frecuencia,
          COALESCE(o.monetario, 0)::float AS monetario
        FROM cli_clientes c
        LEFT JOIN ordenes o ON o.id_cliente = c.id
        ORDER BY COALESCE(o.monetario, 0) DESC
        LIMIT ${parseInt(limit as string)}
      `;
      // Asignar quintiles (simplificado)
      res.json(clientes);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async abandonoCarrito(req: Request, res: Response) {
    try {
      const data: any = await prisma.$queryRaw`
        WITH c AS (
          SELECT TO_CHAR(DATE_TRUNC('month', creado), 'YYYY-MM') AS mes, COUNT(*)::float AS carritos
          FROM ord_carritos
          GROUP BY 1
        ),
        o AS (
          SELECT TO_CHAR(DATE_TRUNC('month', fecha), 'YYYY-MM') AS mes, COUNT(*)::float AS ordenes
          FROM ord_ordenes
          GROUP BY 1
        )
        SELECT
          COALESCE(c.mes, o.mes) AS mes,
          COALESCE(c.carritos, 0)::float AS carritos,
          COALESCE(o.ordenes, 0)::float AS ordenes,
          CASE WHEN COALESCE(c.carritos, 0) = 0 THEN 0 ELSE ((COALESCE(c.carritos, 0) - COALESCE(o.ordenes, 0)) / c.carritos) * 100 END::float AS tasa_abandono
        FROM c FULL OUTER JOIN o ON c.mes = o.mes
        ORDER BY 1
      `;
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async cohortes(req: Request, res: Response) {
    try {
      const data: any = await prisma.$queryRaw`
        WITH first_order AS (
          SELECT id_cliente, DATE_TRUNC('month', MIN(fecha)) AS cohorte
          FROM ord_ordenes
          GROUP BY id_cliente
        ),
        activity AS (
          SELECT o.id_cliente,
                 DATE_TRUNC('month', o.fecha) AS mes_actividad
          FROM ord_ordenes o
        )
        SELECT TO_CHAR(f.cohorte, 'YYYY-MM') AS cohorte,
               TO_CHAR(a.mes_actividad, 'YYYY-MM') AS mes_actividad,
               COUNT(DISTINCT a.id_cliente)::int AS clientes
        FROM first_order f
        JOIN activity a ON a.id_cliente = f.id_cliente
        GROUP BY 1,2
        ORDER BY 1,2
      `;
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async correlacionDescuento(req: Request, res: Response) {
    try {
      const data: any = await prisma.$queryRaw`
        SELECT
          TO_CHAR(DATE_TRUNC('month', fecha), 'YYYY-MM') AS mes,
          AVG(COALESCE(descuento, 0))::float AS descuento_promedio,
          SUM(total)::float AS ventas
        FROM ord_ordenes
        WHERE id_estado IN (SELECT id FROM ord_estados_orden WHERE nombre IN ('pagada','pagado','entregada','entregado'))
        GROUP BY 1
        ORDER BY 1
      `;
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async ticketSegmentos(req: Request, res: Response) {
    try {
      const data: any = await prisma.$queryRaw`
        WITH base AS (
          SELECT c.id,
                 c.nombre,
                 COUNT(o.id)::int AS frecuencia,
                 COALESCE(SUM(o.total), 0)::float AS monetario,
                 COALESCE(AVG(o.total), 0)::float AS ticket_promedio
          FROM cli_clientes c
          LEFT JOIN ord_ordenes o ON o.id_cliente = c.id
            AND o.id_estado IN (SELECT id FROM ord_estados_orden WHERE nombre IN ('pagada','pagado','entregada','entregado'))
          GROUP BY c.id, c.nombre
        ),
        segmentado AS (
          SELECT
            id,
            nombre,
            CASE
              WHEN frecuencia >= 10 OR monetario >= 3000 THEN 'VIP'
              WHEN frecuencia >= 2 THEN 'RECURRENTE'
              ELSE 'NUEVO'
            END AS segmento,
            frecuencia,
            monetario,
            ticket_promedio
          FROM base
        ),
        vip_top AS (
          SELECT nombre
          FROM segmentado
          WHERE segmento = 'VIP'
          ORDER BY monetario DESC
          LIMIT 1
        )
        SELECT
          s.segmento,
          AVG(s.ticket_promedio)::float AS ticket_promedio,
          COUNT(*)::int AS clientes,
          (SELECT nombre FROM vip_top) AS vip_cliente
        FROM segmentado s
        GROUP BY s.segmento
        ORDER BY
          CASE s.segmento WHEN 'VIP' THEN 1 WHEN 'RECURRENTE' THEN 2 ELSE 3 END
      `;
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}
