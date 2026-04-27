import puppeteer from 'puppeteer';
import { Request, Response } from 'express';
import prisma from '../lib/prisma';

const safeText = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const baseStyles = `
  @page { margin: 20px; }
  body { font-family: 'Inter', 'Segoe UI', Arial, sans-serif; color: #1e293b; background: #ffffff; margin: 0; padding: 20px; font-size: 11px; }
  .header { background: #0f172a; color: white; padding: 30px; border-radius: 12px; margin-bottom: 25px; position: relative; overflow: hidden; }
  .header::after { content: ''; position: absolute; top: 0; right: 0; width: 300px; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05)); transform: skewX(-20deg); }
  .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em; }
  .header p { margin: 5px 0 0; color: #94a3b8; font-size: 13px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px; }
  .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 10px; }
  .kpi-label { color: #64748b; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
  .kpi-value { font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 4px; }
  .section { margin-bottom: 30px; }
  .section-title { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
  .section-title::before { content: ''; width: 4px; height: 16px; background: #3b82f6; border-radius: 2px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f1f5f9; color: #475569; font-weight: 600; text-align: left; padding: 8px 10px; font-size: 9px; text-transform: uppercase; }
  td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; }
  .text-right { text-align: right; }
  .font-bold { font-weight: 700; }
  .success { color: #059669; }
  .danger { color: #dc2626; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 9px; text-align: center; }
  .inventory-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
  .chart-wrap { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; }
  .chart-title { font-size: 11px; font-weight: 700; color: #0f172a; margin-bottom: 10px; }
  .bar-row { display: grid; grid-template-columns: 115px 1fr 36px; gap: 8px; align-items: center; margin-bottom: 7px; }
  .bar-label { font-size: 9px; color: #334155; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .bar-track { height: 12px; border-radius: 999px; background: #e2e8f0; overflow: hidden; }
  .bar-fill { height: 12px; border-radius: 999px; background: linear-gradient(90deg, #06b6d4, #0284c7); }
  .bar-value { text-align: right; font-size: 9px; color: #334155; font-weight: 700; }
  .pie-wrap { display: flex; align-items: center; gap: 14px; }
  .pie-chart { width: 120px; height: 120px; border-radius: 999px; }
  .pie-legend { display: grid; gap: 6px; flex: 1; }
  .legend-item { display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #334155; }
  .legend-left { display: flex; align-items: center; gap: 6px; }
  .dot { width: 9px; height: 9px; border-radius: 999px; }
`;

const renderHtmlToPdf = async (res: Response, htmlContent: string, filename: string) => {
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=none',
        '--disable-extensions',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
      timeout: 120000,
      ...(process.env.PUPPETEER_EXECUTABLE_PATH ? { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH } : {}),
    });

    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(90000);
    await page.setDefaultTimeout(90000);
    await page.setViewport({ width: 1200, height: 1600 });
    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded', timeout: 60000 });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
      preferCSSPageSize: true,
      timeout: 120000,
    });

    await page.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
    browser = null;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(pdfBuffer);
  } catch (error: any) {
    if (browser) {
      await browser.close().catch(() => undefined);
    }
    res.status(500).json({
      success: false,
      message: 'No se pudo generar el reporte de gestión',
      detail: error?.message || 'Error interno del servidor',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    });
  }
};

export const generateManagementReport = async (_req: Request, res: Response) => {
  try {
    const totalVentas = await prisma.ord_ordenes.aggregate({
      where: { id_estado: { notIn: [6] } },
      _sum: { total: true },
      _count: { id: true },
    });

    const ventasNetas = Number(totalVentas._sum.total || 0);
    const numOrdenes = totalVentas._count.id || 1;
    const ticketPromedio = ventasNetas / numOrdenes;

    const rentabilidadProductos = (await prisma.$queryRaw`
      SELECT
        p.nombre,
        CAST(SUM(oi.cantidad) AS INTEGER) as unidades,
        CAST(SUM(oi.subtotal) AS NUMERIC) as ingresos,
        CAST(SUM(oi.cantidad * COALESCE(p.precio_costo, 0)) AS NUMERIC) as costos,
        CAST(SUM(oi.subtotal - (oi.cantidad * COALESCE(p.precio_costo, 0))) AS NUMERIC) as utilidad
      FROM cat_productos p
      JOIN ord_items_orden oi ON p.id = oi.id_producto
      JOIN ord_ordenes o ON oi.id_orden = o.id
      WHERE o.id_estado != 6
      GROUP BY p.nombre
      ORDER BY utilidad DESC
      LIMIT 10
    `) as any[];

    const carritosStats = (await prisma.$queryRaw`
      SELECT
        CAST((SELECT COUNT(*) FROM ord_carritos) AS INTEGER) as activos,
        CAST((SELECT COUNT(*) FROM ord_items_carrito) AS INTEGER) as items_pendientes,
        CAST((SELECT COUNT(*) FROM ord_ordenes WHERE fecha > NOW() - INTERVAL '30 days') AS INTEGER) as conversion_mes
    `) as any[];

    const clientesStats = (await prisma.$queryRaw`
      SELECT
        CAST((SELECT COUNT(*) FROM cli_clientes WHERE fecha_registro > NOW() - INTERVAL '30 days') AS INTEGER) as nuevos,
        CAST((SELECT COUNT(*) FROM (SELECT id_cliente FROM ord_ordenes GROUP BY id_cliente HAVING COUNT(id) > 1) as sub) AS INTEGER) as recurrentes,
        CAST((SELECT COUNT(*) FROM cli_clientes c WHERE NOT EXISTS (SELECT 1 FROM ord_ordenes o WHERE o.id_cliente = c.id AND o.fecha > NOW() - INTERVAL '60 days')) AS INTEGER) as inactivos,
        CAST((SELECT COUNT(*) FROM (SELECT id_cliente FROM ord_ordenes GROUP BY id_cliente HAVING SUM(total) > 1000) as vip) AS INTEGER) as vip
    `) as any[];

    const rotacionInventario = (await prisma.$queryRaw`
      SELECT
        p.nombre,
        CAST(COALESCE(SUM(oi.cantidad), 0) AS INTEGER) as ventas_30d,
        CAST(p.stock_general AS INTEGER) as stock_actual,
        CASE WHEN p.stock_general > 0 THEN ROUND(CAST(COALESCE(SUM(oi.cantidad), 0) AS NUMERIC) / CAST(p.stock_general AS NUMERIC), 2) ELSE 0 END as indice_rotacion
      FROM cat_productos p
      LEFT JOIN ord_items_orden oi ON p.id = oi.id_producto
      LEFT JOIN ord_ordenes o ON oi.id_orden = o.id AND o.fecha > NOW() - INTERVAL '30 days'
      GROUP BY p.nombre, p.stock_general
      ORDER BY indice_rotacion DESC
      LIMIT 10
    `) as any[];

    const ingresosCostos = (await prisma.$queryRaw`
      SELECT
        TO_CHAR(fecha, 'YYYY-MM') as mes,
        CAST(SUM(total) AS NUMERIC) as ingresos,
        CAST(SUM(COALESCE((SELECT SUM(cantidad * p.precio_costo) FROM ord_items_orden oi JOIN cat_productos p ON oi.id_producto = p.id WHERE oi.id_orden = o.id), 0)) AS NUMERIC) as costos
      FROM ord_ordenes o
      WHERE id_estado != 6
      GROUP BY TO_CHAR(fecha, 'YYYY-MM')
      ORDER BY mes DESC
      LIMIT 6
    `) as any[];

    const reportDate = new Date().toLocaleDateString('es-ES');

    const htmlContent = `
      <html>
        <head><style>${baseStyles}</style></head>
        <body>
          <div class="header">
            <h1>Reporte de Gestión Analítica</h1>
            <p>Análisis estratégico con visualizaciones avanzadas | ${reportDate}</p>
          </div>

          <div class="kpi-grid">
            <div class="kpi-card"><div class="kpi-label">Ventas Netas</div><div class="kpi-value">S/ ${ventasNetas.toLocaleString('es-PE')}</div></div>
            <div class="kpi-card"><div class="kpi-label">Ticket Promedio</div><div class="kpi-value">S/ ${ticketPromedio.toLocaleString('es-PE')}</div></div>
            <div class="kpi-card"><div class="kpi-label">Conversión (30d)</div><div class="kpi-value">${Number(carritosStats[0]?.conversion_mes || 0)}</div></div>
            <div class="kpi-card"><div class="kpi-label">Carts Activos</div><div class="kpi-value">${Number(carritosStats[0]?.activos || 0)}</div></div>
          </div>

          <div class="section">
            <h2 class="section-title">Rentabilidad por Producto (Top 10)</h2>
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th class="text-right">Unidades</th>
                  <th class="text-right">Ingresos</th>
                  <th class="text-right">Costos</th>
                  <th class="text-right">Utilidad</th>
                  <th class="text-right">Margen</th>
                </tr>
              </thead>
              <tbody>
                ${rentabilidadProductos.map((p) => {
                  const margen = Number(p.ingresos) > 0 ? (Number(p.utilidad) / Number(p.ingresos)) * 100 : 0;
                  return `
                    <tr>
                      <td class="font-bold">${safeText(p.nombre)}</td>
                      <td class="text-right">${Number(p.unidades)}</td>
                      <td class="text-right">S/ ${Number(p.ingresos).toLocaleString()}</td>
                      <td class="text-right">S/ ${Number(p.costos).toLocaleString()}</td>
                      <td class="text-right success font-bold">S/ ${Number(p.utilidad).toLocaleString()}</td>
                      <td class="text-right">${margen.toFixed(1)}%</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <div class="grid-2">
            <div class="section">
              <h2 class="section-title">Clientes nuevos/recurrentes/inactivos/VIP</h2>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div class="kpi-card"><div class="kpi-label">Nuevos (30d)</div><div class="kpi-value">${Number(clientesStats[0]?.nuevos || 0)}</div></div>
                <div class="kpi-card"><div class="kpi-label">Recurrentes</div><div class="kpi-value">${Number(clientesStats[0]?.recurrentes || 0)}</div></div>
                <div class="kpi-card"><div class="kpi-label">Inactivos</div><div class="kpi-value">${Number(clientesStats[0]?.inactivos || 0)}</div></div>
                <div class="kpi-card" style="background: #eff6ff;"><div class="kpi-label" style="color: #2563eb;">VIP</div><div class="kpi-value" style="color: #1d4ed8;">${Number(clientesStats[0]?.vip || 0)}</div></div>
              </div>
            </div>

            <div class="section">
              <h2 class="section-title">Rotación de Inventario</h2>
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th class="text-right">Ventas 30d</th>
                    <th class="text-right">Stock</th>
                    <th class="text-right">Índice</th>
                  </tr>
                </thead>
                <tbody>
                  ${rotacionInventario.map((r) => `
                    <tr>
                      <td>${safeText(r.nombre)}</td>
                      <td class="text-right">${Number(r.ventas_30d)}</td>
                      <td class="text-right">${Number(r.stock_actual)}</td>
                      <td class="text-right font-bold ${Number(r.indice_rotacion) > 1 ? 'success' : ''}">${r.indice_rotacion}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <div class="section">
            <h2 class="section-title">Ingresos vs costos mensual</h2>
            <table>
              <thead>
                <tr>
                  <th>Mes</th>
                  <th class="text-right">Ingresos</th>
                  <th class="text-right">Costos</th>
                  <th class="text-right">Utilidad Bruta</th>
                  <th class="text-right">Estado</th>
                </tr>
              </thead>
              <tbody>
                ${ingresosCostos.map((i) => {
                  const utilidad = Number(i.ingresos) - Number(i.costos);
                  return `
                    <tr>
                      <td class="font-bold">${i.mes}</td>
                      <td class="text-right">S/ ${Number(i.ingresos).toLocaleString()}</td>
                      <td class="text-right">S/ ${Number(i.costos).toLocaleString()}</td>
                      <td class="text-right font-bold ${utilidad >= 0 ? 'success' : 'danger'}">S/ ${utilidad.toLocaleString()}</td>
                      <td class="text-right">${utilidad >= 0 ? '▲ Rentable' : '▼ Pérdida'}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <div class="footer">Este informe es para uso exclusivo de la gerencia. Datos generados dinámicamente desde el motor analítico del sistema.</div>
        </body>
      </html>
    `;

    const fileDate = reportDate.replace(/\//g, '-');
    await renderHtmlToPdf(res, htmlContent, `reporte-gestion-${fileDate}.pdf`);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'No se pudo generar el reporte de gestión',
      detail: error?.message || 'Error interno del servidor',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    });
  }
};

export const generateInventoryStockReport = async (_req: Request, res: Response) => {
  try {
    const inventoryKpis = await prisma.$queryRaw<Array<{ total_productos: number; valor_total: number; bajo_stock: number }>>`
      SELECT
        COUNT(*)::int AS total_productos,
        COALESCE(SUM(COALESCE(stock_general, 0) * COALESCE(precio_costo, 0)), 0)::float AS valor_total,
        COUNT(*) FILTER (WHERE COALESCE(stock_general, 0) < COALESCE(stock_minimo, 0))::int AS bajo_stock
      FROM cat_productos
      WHERE estado_producto = 'activo'
    `;

    const productoMasValioso = await prisma.$queryRaw<Array<{ sku: string | null; nombre: string; valor_total: number }>>`
      SELECT
        p.sku,
        p.nombre,
        (COALESCE(p.stock_general, 0) * COALESCE(p.precio_costo, 0))::float AS valor_total
      FROM cat_productos p
      WHERE p.estado_producto = 'activo'
      ORDER BY valor_total DESC
      LIMIT 1
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

    const distribucionStock = await prisma.$queryRaw<Array<{ nombre: string; total: number }>>`
      SELECT
        CASE
          WHEN COALESCE(stock_general, 0) <= 0 THEN 'Sin stock'
          WHEN COALESCE(stock_general, 0) < COALESCE(stock_minimo, 0) THEN 'Bajo stock'
          ELSE 'Stock OK'
        END AS nombre,
        COUNT(*)::int AS total
      FROM cat_productos
      WHERE estado_producto = 'activo'
      GROUP BY 1
      ORDER BY total DESC
    `;

    const reorderList = await prisma.$queryRaw<Array<{ sku: string | null; nombre: string; categoria: string; stock_actual: number; stock_minimo: number; faltante: number }>>`
      SELECT
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

    const inv = inventoryKpis[0] || { total_productos: 0, valor_total: 0, bajo_stock: 0 };
    const masValioso = productoMasValioso[0] || { sku: '-', nombre: 'Sin datos', valor_total: 0 };
    const totalDistribucion = distribucionStock.reduce((acc, cur) => acc + Number(cur.total || 0), 0) || 1;
    const maxCategoria = Math.max(...topCategoriasInventario.map((x) => Number(x.total || 0)), 1);

    const piePalette: Record<string, string> = {
      'Stock OK': '#0ea5a4',
      'Bajo stock': '#f59e0b',
      'Sin stock': '#ef4444',
    };

    let accum = 0;
    const pieGradient = distribucionStock
      .map((item) => {
        const ratio = (Number(item.total || 0) / totalDistribucion) * 100;
        const start = accum;
        const end = accum + ratio;
        accum = end;
        const color = piePalette[item.nombre] || '#64748b';
        return `${color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
      })
      .join(', ');

    const reportDate = new Date().toLocaleDateString('es-ES');

    const htmlContent = `
      <html>
        <head><style>${baseStyles}</style></head>
        <body>
          <div class="header">
            <h1>Reporte de Gestión de Inventario</h1>
            <p>Análisis de Inventario y Bajo Stock | ${reportDate}</p>
          </div>

          <div class="section">
            <h2 class="section-title">Análisis de Inventario y Bajo Stock</h2>
            <div class="inventory-grid">
              <div class="kpi-card"><div class="kpi-label">Productos únicos</div><div class="kpi-value">${Number(inv.total_productos || 0)}</div></div>
              <div class="kpi-card"><div class="kpi-label">Valor inventario</div><div class="kpi-value">S/ ${Number(inv.valor_total || 0).toLocaleString('es-PE')}</div></div>
              <div class="kpi-card"><div class="kpi-label">Bajo stock</div><div class="kpi-value">${Number(inv.bajo_stock || 0)}</div></div>
              <div class="kpi-card"><div class="kpi-label">Producto más valioso</div><div class="kpi-value" style="font-size: 12px; line-height: 1.2;">${safeText(masValioso.nombre)}<br/><span style="font-size:10px;color:#64748b">S/ ${Number(masValioso.valor_total || 0).toLocaleString('es-PE')}</span></div></div>
            </div>

            <div class="grid-2">
              <div class="chart-wrap">
                <div class="chart-title">Top 10 categorías con más productos</div>
                ${topCategoriasInventario.map((row) => {
                  const width = Math.max((Number(row.total || 0) / maxCategoria) * 100, 2);
                  return `
                    <div class="bar-row">
                      <div class="bar-label">${safeText(row.nombre)}</div>
                      <div class="bar-track"><div class="bar-fill" style="width:${width.toFixed(2)}%"></div></div>
                      <div class="bar-value">${Number(row.total || 0)}</div>
                    </div>
                  `;
                }).join('')}
              </div>

              <div class="chart-wrap">
                <div class="chart-title">Distribución del estado de stock</div>
                <div class="pie-wrap">
                  <div class="pie-chart" style="background: conic-gradient(${pieGradient || '#cbd5e1 0% 100%'});"></div>
                  <div class="pie-legend">
                    ${distribucionStock.map((row) => `
                      <div class="legend-item">
                        <div class="legend-left">
                          <span class="dot" style="background:${piePalette[row.nombre] || '#64748b'}"></span>
                          <span>${safeText(row.nombre)}</span>
                        </div>
                        <span>${Number(row.total || 0)}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            </div>

            <div style="margin-top:16px;">
              <div class="chart-title">Listado de productos que necesitan reordenar</div>
              <table>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th class="text-right">Stock Actual</th>
                    <th class="text-right">Stock Mínimo</th>
                    <th class="text-right">Faltante</th>
                  </tr>
                </thead>
                <tbody>
                  ${reorderList.length === 0
                    ? '<tr><td colspan="6" style="text-align:center;color:#64748b;">No hay productos para reordenar.</td></tr>'
                    : reorderList
                        .map(
                          (row) => `
                    <tr>
                      <td>${safeText(row.sku || '-')}</td>
                      <td class="font-bold">${safeText(row.nombre)}</td>
                      <td>${safeText(row.categoria)}</td>
                      <td class="text-right">${Number(row.stock_actual || 0)}</td>
                      <td class="text-right">${Number(row.stock_minimo || 0)}</td>
                      <td class="text-right danger font-bold">${Number(row.faltante || 0)}</td>
                    </tr>
                  `
                        )
                        .join('')}
                </tbody>
              </table>
            </div>
          </div>

          <div class="footer">Este informe es para uso exclusivo de la gerencia de inventario. Datos generados dinámicamente desde el motor analítico del sistema.</div>
        </body>
      </html>
    `;

    const fileDate = reportDate.replace(/\//g, '-');
    await renderHtmlToPdf(res, htmlContent, `reporte-gestion-inventario-${fileDate}.pdf`);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'No se pudo generar el reporte de inventario',
      detail: error?.message || 'Error interno del servidor',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    });
  }
};
