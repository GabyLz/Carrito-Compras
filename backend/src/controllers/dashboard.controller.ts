import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

export class DashboardController {
  async getKPIs(req: Request, res: Response, next: NextFunction) {
    try {
      const totalVentas = await prisma.ord_ordenes.aggregate({
        _sum: { total: true },
        where: { estado: { nombre: { in: ['pagada', 'entregada', 'pagado', 'entregado'] } } }
      });

      const totalOrdenes = await prisma.ord_ordenes.count();
      const ordenesCompletadas = await prisma.ord_ordenes.count({
        where: { estado: { nombre: { in: ['pagada', 'entregada', 'pagado', 'entregado'] } } },
      });

      const ticketPromedio = ordenesCompletadas > 0 ? Number(totalVentas._sum.total || 0) / ordenesCompletadas : 0;

      const carritosCreados = await prisma.ord_carritos.count();
      const abandonoCarrito = carritosCreados > 0 ? ((carritosCreados - totalOrdenes) / carritosCreados) * 100 : 0;

      const productosStockBajo = await prisma.$queryRaw<Array<{ total: bigint }>>`
        SELECT COUNT(*)::bigint AS total
        FROM cat_productos
        WHERE stock_general > 0 AND stock_general <= stock_minimo
      `;

      const productosAgotados = await prisma.$queryRaw<Array<{ total: bigint }>>`
        SELECT COUNT(*)::bigint AS total
        FROM cat_productos
        WHERE stock_general = 0
      `;

      const clientesNuevos = await prisma.cli_clientes.count({
        where: {
          fecha_registro: {
            gte: new Date(new Date().setDate(new Date().getDate() - 30))
          }
        }
      });

      const ordenesPendientes = await prisma.ord_ordenes.count({
        where: { estado: { nombre: { in: ['pendiente_pago', 'en_proceso', 'pendiente'] } } },
      });

      const reembolsos = await prisma.ord_devoluciones.aggregate({
        _count: { id: true },
        _sum: { monto_reembolsado: true },
        where: {
          fecha_solicitud: {
            gte: new Date(new Date().setDate(new Date().getDate() - 30)),
          },
        },
      });

      const totalProductosUnicos = await prisma.cat_productos.count({
        where: { estado_producto: 'activo' },
      });

      const valorTotalInventario = await prisma.$queryRaw<Array<{ total: number }>>`
        SELECT COALESCE(SUM(COALESCE(stock_general, 0) * COALESCE(precio_costo, 0)), 0)::float AS total
        FROM cat_productos
        WHERE estado_producto = 'activo'
      `;

      const productoMasValioso = await prisma.$queryRaw<Array<{ id: number; sku: string | null; nombre: string; stock_actual: number; precio_compra: number; valor_total: number }>>`
        SELECT
          p.id,
          p.sku,
          p.nombre,
          COALESCE(p.stock_general, 0)::int AS stock_actual,
          COALESCE(p.precio_costo, 0)::float AS precio_compra,
          (COALESCE(p.stock_general, 0) * COALESCE(p.precio_costo, 0))::float AS valor_total
        FROM cat_productos p
        WHERE p.estado_producto = 'activo'
        ORDER BY valor_total DESC
        LIMIT 1
      `;

      res.json({
        ventasTotales: totalVentas._sum.total || 0,
        totalOrdenes,
        ordenesTotales: totalOrdenes,
        ticketPromedio,
        tasaConversion: carritosCreados > 0 ? (totalOrdenes / carritosCreados) * 100 : 0,
        tasaAbandonoCarrito: abandonoCarrito,
        productosStockBajo: Number(productosStockBajo[0]?.total || 0),
        productosAgotados: Number(productosAgotados[0]?.total || 0),
        clientesNuevos,
        ordenesPendientes,
        reembolsosCantidad: reembolsos._count.id || 0,
        reembolsosMonto: Number(reembolsos._sum.monto_reembolsado || 0),
        totalProductosUnicos,
        valorTotalInventario: Number(valorTotalInventario[0]?.total || 0),
        productosBajoStockInventario: Number(productosStockBajo[0]?.total || 0),
        productoMasValiosoInventario: productoMasValioso[0] || null,
      });
    } catch (error: any) {
      next(error);
    }
  }

  async getVentasPorCategoria(req: Request, res: Response, next: NextFunction) {
    try {
      const ventas = await prisma.$queryRaw`
        SELECT c.nombre, SUM(io.cantidad * io.precio_unitario) as total
        FROM ord_items_orden io
        JOIN cat_productos p ON io.id_producto = p.id
        JOIN cat_categorias c ON p.id_categoria = c.id
        GROUP BY c.nombre
      `;
      res.json(ventas);
    } catch (error: any) {
      next(error);
    }
  }

  async getDashboardData(req: Request, res: Response, next: NextFunction) {
    try {
      const ventasMensuales = await prisma.$queryRaw<Array<{ mes: string; total: number }>>`
        SELECT TO_CHAR(DATE_TRUNC('month', fecha), 'YYYY-MM') AS mes, COALESCE(SUM(total), 0)::float AS total
        FROM ord_ordenes
        GROUP BY 1
        ORDER BY 1
      `;

      const ventasPorCategoria = await prisma.$queryRaw<Array<{ nombre: string; total: number }>>`
        SELECT COALESCE(c.nombre, 'Sin categoria') AS nombre, COALESCE(SUM(io.cantidad * io.precio_unitario), 0)::float AS total
        FROM ord_items_orden io
        JOIN cat_productos p ON io.id_producto = p.id
        LEFT JOIN cat_categorias c ON p.id_categoria = c.id
        GROUP BY 1
        ORDER BY total DESC
        LIMIT 5
      `;

      const estados = await prisma.$queryRaw<Array<{ nombre: string; total: number }>>`
        SELECT COALESCE(e.nombre, 'sin_estado') AS nombre, COUNT(*)::int AS total
        FROM ord_ordenes o
        LEFT JOIN ord_estados_orden e ON o.id_estado = e.id
        GROUP BY 1
        ORDER BY total DESC
      `;

      const topProductos = await prisma.$queryRaw<Array<{ nombre: string; total: number }>>`
        SELECT p.nombre, COALESCE(SUM(io.cantidad), 0)::int AS total
        FROM ord_items_orden io
        JOIN cat_productos p ON io.id_producto = p.id
        GROUP BY p.nombre
        ORDER BY total DESC
        LIMIT 10
      `;

      const carritos = await prisma.ord_carritos.count();
      const ordenes = await prisma.ord_ordenes.count();
      const checkout = Math.max(ordenes, 1);

      const ingresosVsCostos = await prisma.$queryRaw<Array<{ mes: string; ingresos: number; costos: number }>>`
        SELECT
          TO_CHAR(DATE_TRUNC('month', o.fecha), 'YYYY-MM') AS mes,
          COALESCE(SUM(io.subtotal), 0)::float AS ingresos,
          COALESCE(SUM(io.cantidad * p.precio_costo), 0)::float AS costos
        FROM ord_ordenes o
        JOIN ord_items_orden io ON io.id_orden = o.id
        JOIN cat_productos p ON p.id = io.id_producto
        GROUP BY 1
        ORDER BY 1
      `;

      const abandonoTrend = await prisma.$queryRaw<Array<{ mes: string; tasa: number }>>`
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
          CASE WHEN COALESCE(c.carritos, 0) = 0 THEN 0 ELSE ((COALESCE(c.carritos, 0) - COALESCE(o.ordenes, 0)) / c.carritos) * 100 END::float AS tasa
        FROM c
        FULL OUTER JOIN o ON c.mes = o.mes
        ORDER BY 1
      `;

      const topCategoriasInventario = await prisma.$queryRaw<Array<{ nombre: string; total: number }>>`
        SELECT
          COALESCE(c.nombre, 'Sin categoria') AS nombre,
          COUNT(*)::int AS total
        FROM cat_productos p
        LEFT JOIN cat_categorias c ON c.id = p.id_categoria
        WHERE p.estado_producto = 'activo'
        GROUP BY 1
        ORDER BY total DESC
        LIMIT 10
      `;

      const estadoStockInventario = await prisma.$queryRaw<Array<{ nombre: string; total: number }>>`
        SELECT
          CASE
            WHEN COALESCE(p.stock_general, 0) <= 0 THEN 'Sin stock'
            WHEN COALESCE(p.stock_general, 0) < COALESCE(p.stock_minimo, 0) THEN 'Bajo stock'
            ELSE 'Stock OK'
          END AS nombre,
          COUNT(*)::int AS total
        FROM cat_productos p
        WHERE p.estado_producto = 'activo'
        GROUP BY 1
        ORDER BY total DESC
      `;

      const productosReorden = await prisma.$queryRaw<Array<{ id: number; sku: string | null; nombre: string; categoria: string; stock_actual: number; stock_minimo: number; faltante: number }>>`
        SELECT
          p.id,
          p.sku,
          p.nombre,
          COALESCE(c.nombre, 'Sin categoria') AS categoria,
          COALESCE(p.stock_general, 0)::int AS stock_actual,
          COALESCE(p.stock_minimo, 0)::int AS stock_minimo,
          GREATEST(COALESCE(p.stock_minimo, 0) - COALESCE(p.stock_general, 0), 0)::int AS faltante
        FROM cat_productos p
        LEFT JOIN cat_categorias c ON c.id = p.id_categoria
        WHERE p.estado_producto = 'activo'
          AND COALESCE(p.stock_general, 0) < COALESCE(p.stock_minimo, 0)
        ORDER BY faltante DESC, p.nombre ASC
        LIMIT 100
      `;

      res.json({
        areaVentas: ventasMensuales,
        ventasPorCategoria,
        estados,
        topProductos,
        ingresosVsCostos,
        abandonoTrend,
        topCategoriasInventario,
        estadoStockInventario,
        productosReorden,
        funnel: [
          { name: 'Visitas', value: 1000 },
          { name: 'Carrito', value: carritos || 0 },
          { name: 'Checkout', value: checkout },
          { name: 'Pago', value: ordenes },
        ],
      });
    } catch (error: any) {
      next(error);
    }
  }
}
