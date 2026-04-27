import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import prisma from '../lib/prisma';

type ProductLowStock = {
  nombre: string;
  stock_general: number;
  stock_minimo: number;
  categoria?: { nombre?: string | null } | null;
};

type ReportKpi = {
  ventasNetas: number;
  ticketPromedio: number;
  conversionMes: number;
  carritosActivos: number;
};

const theme = {
  navy: '#0f172a',
  slate: '#475569',
  text: '#1e293b',
  muted: '#64748b',
  border: '#dbe4ee',
  surface: '#f8fafc',
  accent: '#0f766e',
  accentSoft: '#e6fffb',
  danger: '#dc2626',
  warning: '#d97706',
  success: '#059669',
};

const safeText = (value: unknown) => String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim();

const setPdfHeaders = (res: Response, filename: string) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
};

const createPdfDoc = (res: Response, filename: string) => {
  setPdfHeaders(res, filename);
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(res);
  return doc;
};

const finishPdf = (doc: PDFDocument) => {
  doc.end();
};

const writeHeader = (doc: PDFDocument, title: string, subtitle: string) => {
  doc.rect(0, 0, doc.page.width, 92).fill(theme.navy);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(18).text('Commerce Suite', 40, 22);
  doc.fillColor('#cbd5e1').font('Helvetica').fontSize(9).text('Reporte empresarial', 40, 44);

  doc.roundedRect(doc.page.width - 168, 20, 128, 34, 8).fillAndStroke('#111c33', '#334155');
  doc.fillColor('#e2e8f0').font('Helvetica-Bold').fontSize(8).text('Gerencia', doc.page.width - 150, 30, { width: 90, align: 'center' });
  doc.fillColor('#ffffff').fontSize(10).text('Exportación PDF', doc.page.width - 150, 41, { width: 90, align: 'center' });

  doc.fillColor(theme.navy).font('Helvetica-Bold').fontSize(16).text(title, 40, 108);
  doc.font('Helvetica').fillColor(theme.muted).fontSize(10).text(subtitle, 40, 128);
  doc.moveTo(40, 145).lineTo(doc.page.width - 40, 145).lineWidth(1).stroke(theme.border);
  doc.moveDown(1.2);
};

const writeSectionTitle = (doc: PDFDocument, title: string) => {
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').fillColor(theme.navy).fontSize(13).text(title);
  doc.moveTo(40, doc.y + 2).lineTo(125, doc.y + 2).lineWidth(2).stroke(theme.accent);
  doc.moveDown(0.3);
};

const ensureSpace = (doc: PDFDocument, currentY: number, needed = 90) => {
  if (currentY > doc.page.height - needed) {
    doc.addPage();
    return 40;
  }
  return currentY;
};

const drawTableHeader = (doc: PDFDocument, y: number, headers: string[], widths: number[]) => {
  const x = 40;
  doc.roundedRect(x, y, 540, 22, 6).fillAndStroke(theme.surface, theme.border);
  doc.fillColor(theme.slate).font('Helvetica-Bold').fontSize(9);
  let cursor = x + 5;
  headers.forEach((header, index) => {
    doc.text(header, cursor, y + 5);
    cursor += widths[index];
  });
  return y + 25;
};

const drawKpiCard = (doc: PDFDocument, x: number, y: number, width: number, label: string, value: string, tone = '#f8fafc') => {
  doc.roundedRect(x, y, width, 72, 10).fillAndStroke(tone, theme.border);
  doc.moveTo(x, y).lineTo(x + width, y).lineWidth(3).stroke(theme.accent);
  doc.fillColor(theme.muted).font('Helvetica').fontSize(8).text(label.toUpperCase(), x + 12, y + 14, { width: width - 24 });
  doc.fillColor(theme.navy).font('Helvetica-Bold').fontSize(15).text(value, x + 12, y + 34, { width: width - 24 });
  doc.font('Helvetica');
};

const drawValueRow = (doc: PDFDocument, y: number, label: string, value: string, danger = false) => {
  doc.roundedRect(40, y - 2, 540, 18, 5).fillAndStroke('#ffffff', theme.border);
  doc.fillColor(theme.slate).font('Helvetica').fontSize(10).text(label, 50, y, { width: 350 });
  doc.fillColor(danger ? theme.danger : theme.navy).font('Helvetica-Bold').text(value, 420, y, { width: 150, align: 'right' });
  doc.font('Helvetica');
  return y + 20;
};

const writeLowStockSection = (doc: PDFDocument, products: ProductLowStock[]) => {
  writeSectionTitle(doc, 'Productos con bajo stock');

  if (!products.length) {
    doc.fillColor(theme.muted).font('Helvetica').fontSize(10).text('No hay productos con bajo stock.');
    return;
  }

  let y = drawTableHeader(doc, doc.y + 6, ['Producto', 'Categoría', 'Stock Actual', 'Stock Mínimo'], [230, 150, 80, 80]);
  products.slice(0, 100).forEach((product, index) => {
    y = ensureSpace(doc, y, 110);
    if (index % 2 === 0) {
      doc.rect(40, y - 2, 540, 20).fill('#fcfdff');
    }

    doc.fillColor(theme.text).font('Helvetica').fontSize(10);
    doc.text(safeText(product.nombre), 45, y, { width: 220 });
    doc.text(safeText(product.categoria?.nombre || '-'), 275, y, { width: 140 });
    doc.fillColor(product.stock_general <= 0 ? theme.danger : theme.warning).font('Helvetica-Bold').text(String(Number(product.stock_general || 0)), 425, y, { width: 70, align: 'right' });
    doc.fillColor(theme.text).font('Helvetica').text(String(Number(product.stock_minimo || 0)), 505, y, { width: 70, align: 'right' });
    y += 25;
  });
};

const buildManagementPdf = (
  res: Response,
  filename: string,
  title: string,
  subtitle: string,
  kpi: ReportKpi,
  rentabilidadProductos: Array<{ nombre: string; unidades: number; ingresos: number; costos: number; utilidad: number }>,
  clientesStats: { nuevos: number; recurrentes: number; inactivos: number; vip: number },
  rotacionInventario: Array<{ nombre: string; ventas_30d: number; stock_actual: number; indice_rotacion: number }>,
  ingresosCostos: Array<{ mes: string; ingresos: number; costos: number }>,
  bajoStock: ProductLowStock[]
) => {
  const doc = createPdfDoc(res, filename);
  writeHeader(doc, title, subtitle);

  doc.roundedRect(40, 160, 540, 42, 8).fillAndStroke('#eff6ff', '#dbeafe');
  doc.fillColor(theme.slate).font('Helvetica').fontSize(9).text('Resumen ejecutivo', 52, 168);
  doc.fillColor(theme.navy).font('Helvetica-Bold').fontSize(10).text('Documento de apoyo para decisiones gerenciales, con indicadores financieros, clientes, inventario y alertas.', 52, 182, { width: 510 });

  drawKpiCard(doc, 40, 150, 120, 'Ventas netas', `S/ ${kpi.ventasNetas.toLocaleString('es-PE')}`);
  drawKpiCard(doc, 170, 150, 120, 'Ticket promedio', `S/ ${kpi.ticketPromedio.toLocaleString('es-PE')}`);
  drawKpiCard(doc, 300, 150, 120, 'Conversión 30d', String(kpi.conversionMes));
  drawKpiCard(doc, 430, 150, 150, 'Carritos activos', String(kpi.carritosActivos));

  let y = 250;

  writeSectionTitle(doc, 'Rentabilidad por producto');
  y = drawTableHeader(doc, doc.y + 6, ['Producto', 'Unid.', 'Ingresos', 'Costos', 'Utilidad', 'Margen'], [190, 60, 95, 95, 95, 5]);
  rentabilidadProductos.slice(0, 10).forEach((row, index) => {
    y = ensureSpace(doc, y, 120);
    if (index % 2 === 0) {
      doc.rect(40, y - 2, 540, 20).fill('#fcfdff');
    }
    const margen = row.ingresos > 0 ? (row.utilidad / row.ingresos) * 100 : 0;
    doc.fillColor(theme.text).font('Helvetica').fontSize(10);
    doc.text(safeText(row.nombre), 45, y, { width: 180 });
    doc.text(String(row.unidades), 235, y, { width: 55, align: 'right' });
    doc.text(`S/ ${row.ingresos.toLocaleString('es-PE')}`, 295, y, { width: 90, align: 'right' });
    doc.text(`S/ ${row.costos.toLocaleString('es-PE')}`, 390, y, { width: 90, align: 'right' });
    doc.fillColor(theme.success).font('Helvetica-Bold').text(`S/ ${row.utilidad.toLocaleString('es-PE')}`, 485, y, { width: 70, align: 'right' });
    doc.fillColor(theme.text).font('Helvetica').text(`${margen.toFixed(1)}%`, 555, y, { width: 20, align: 'right' });
    y += 25;
  });

  y = ensureSpace(doc, y + 10, 140);
  writeSectionTitle(doc, 'Clientes');
  y = drawValueRow(doc, doc.y + 6, 'Nuevos (30d)', String(clientesStats.nuevos));
  y = drawValueRow(doc, y, 'Recurrentes', String(clientesStats.recurrentes));
  y = drawValueRow(doc, y, 'Inactivos', String(clientesStats.inactivos));
  y = drawValueRow(doc, y, 'VIP', String(clientesStats.vip));

  y = ensureSpace(doc, y + 10, 180);
  writeSectionTitle(doc, 'Rotación de inventario');
  y = drawTableHeader(doc, doc.y + 6, ['Producto', 'Ventas 30d', 'Stock', 'Índice'], [250, 110, 90, 90]);
  rotacionInventario.slice(0, 10).forEach((row, index) => {
    y = ensureSpace(doc, y, 120);
    if (index % 2 === 0) {
      doc.rect(40, y - 2, 540, 20).fill('#f8fafc');
    }
    doc.fillColor('#1e293b').font('Helvetica').fontSize(10);
    doc.text(safeText(row.nombre), 45, y, { width: 240 });
    doc.text(String(row.ventas_30d), 305, y, { width: 80, align: 'right' });
    doc.text(String(row.stock_actual), 395, y, { width: 70, align: 'right' });
    doc.fillColor(row.indice_rotacion > 1 ? '#059669' : '#dc2626').font('Helvetica-Bold').text(String(row.indice_rotacion), 465, y, { width: 105, align: 'right' });
    doc.font('Helvetica');
    y += 25;
  });

  y = ensureSpace(doc, y + 10, 180);
  writeSectionTitle(doc, 'Ingresos vs costos mensual');
  y = drawTableHeader(doc, doc.y + 6, ['Mes', 'Ingresos', 'Costos', 'Utilidad'], [140, 120, 120, 160]);
  ingresosCostos.slice(0, 6).forEach((row, index) => {
    y = ensureSpace(doc, y, 120);
    if (index % 2 === 0) {
      doc.rect(40, y - 2, 540, 20).fill('#f8fafc');
    }
    const utilidad = row.ingresos - row.costos;
    doc.fillColor('#1e293b').font('Helvetica').fontSize(10);
    doc.text(row.mes, 45, y, { width: 120 });
    doc.text(`S/ ${row.ingresos.toLocaleString('es-PE')}`, 185, y, { width: 100, align: 'right' });
    doc.text(`S/ ${row.costos.toLocaleString('es-PE')}`, 305, y, { width: 100, align: 'right' });
    doc.fillColor(utilidad >= 0 ? '#059669' : '#dc2626').font('Helvetica-Bold').text(`S/ ${utilidad.toLocaleString('es-PE')}`, 425, y, { width: 150, align: 'right' });
    doc.font('Helvetica');
    y += 25;
  });

  y = ensureSpace(doc, y + 10, 220);
  writeLowStockSection(doc, bajoStock);

  doc.moveDown(2);
  doc.moveTo(40, doc.y + 4).lineTo(doc.page.width - 40, doc.y + 4).lineWidth(1).stroke(theme.border);
  doc.fontSize(9).fillColor(theme.muted).text('Este informe es para uso exclusivo de la gerencia.', 40, doc.page.height - 40, { align: 'center', width: doc.page.width - 80 });
  finishPdf(doc);
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

    const bajoStock = await prisma.cat_productos.findMany({
      where: { estado_producto: 'activo', stock_general: { lte: 10 } },
      include: { categoria: true },
      orderBy: [{ stock_general: 'asc' }, { nombre: 'asc' }],
      take: 100,
    });

    const reportDate = new Date().toLocaleDateString('es-ES');
    buildManagementPdf(
      res,
      `reporte-gestion-${reportDate.replace(/\//g, '-')}.pdf`,
      'Reporte de gestión',
      `Análisis estratégico | ${reportDate}`,
      {
        ventasNetas,
        ticketPromedio,
        conversionMes: Number(carritosStats[0]?.conversion_mes || 0),
        carritosActivos: Number(carritosStats[0]?.activos || 0),
      },
      rentabilidadProductos.map((p: any) => ({
        nombre: String(p.nombre),
        unidades: Number(p.unidades || 0),
        ingresos: Number(p.ingresos || 0),
        costos: Number(p.costos || 0),
        utilidad: Number(p.utilidad || 0),
      })),
      {
        nuevos: Number(clientesStats[0]?.nuevos || 0),
        recurrentes: Number(clientesStats[0]?.recurrentes || 0),
        inactivos: Number(clientesStats[0]?.inactivos || 0),
        vip: Number(clientesStats[0]?.vip || 0),
      },
      rotacionInventario.map((r: any) => ({
        nombre: String(r.nombre),
        ventas_30d: Number(r.ventas_30d || 0),
        stock_actual: Number(r.stock_actual || 0),
        indice_rotacion: Number(r.indice_rotacion || 0),
      })),
      ingresosCostos.map((i: any) => ({
        mes: String(i.mes),
        ingresos: Number(i.ingresos || 0),
        costos: Number(i.costos || 0),
      })),
      bajoStock.map((p) => ({
        nombre: p.nombre,
        stock_general: Number(p.stock_general || 0),
        stock_minimo: Number(p.stock_minimo || 0),
        categoria: p.categoria,
      }))
    );
  } catch (error: any) {
    if (!res.headersSent) {
      const doc = createPdfDoc(res, `reporte-gestion-error-${Date.now()}.pdf`);
      writeHeader(doc, 'Reporte de gestión', 'Se generó una versión básica de respaldo');
      doc.font('Helvetica').fontSize(10).fillColor('#334155').text('No se pudo generar la versión avanzada del reporte.');
      doc.text(`Detalle técnico: ${error?.message || 'Error interno del servidor'}`);
      finishPdf(doc);
    }
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
    const reportDate = new Date().toLocaleDateString('es-ES');

    const doc = createPdfDoc(res, `reporte-gestion-inventario-${reportDate.replace(/\//g, '-')}.pdf`);
    writeHeader(doc, 'Reporte de gestión de inventario', `Análisis de inventario y bajo stock | ${reportDate}`);

    doc.roundedRect(40, 160, 540, 42, 8).fillAndStroke('#ecfeff', '#cffafe');
    doc.fillColor(theme.slate).font('Helvetica').fontSize(9).text('Resumen ejecutivo', 52, 168);
    doc.fillColor(theme.navy).font('Helvetica-Bold').fontSize(10).text('Visión consolidada de inventario, categorías, distribución de stock y productos para reposición.', 52, 182, { width: 510 });

    drawKpiCard(doc, 40, 150, 120, 'Productos únicos', String(Number(inv.total_productos || 0)));
    drawKpiCard(doc, 170, 150, 120, 'Valor inventario', `S/ ${Number(inv.valor_total || 0).toLocaleString('es-PE')}`);
    drawKpiCard(doc, 300, 150, 120, 'Bajo stock', String(Number(inv.bajo_stock || 0)));
    drawKpiCard(doc, 430, 150, 150, 'Producto más valioso', safeText(masValioso.nombre));

    let y = 250;
    writeSectionTitle(doc, 'Top 10 categorías con más productos');
    y = drawTableHeader(doc, doc.y + 6, ['Categoría', 'Total', 'Observación'], [230, 70, 240]);
    const maxCategoria = Math.max(...topCategoriasInventario.map((x: { total: number }) => Number(x.total || 0)), 1);
    topCategoriasInventario.slice(0, 10).forEach((row, index) => {
      y = ensureSpace(doc, y, 120);
      if (index % 2 === 0) {
        doc.rect(40, y - 2, 540, 20).fill('#fcfdff');
      }
      const progress = Math.max((Number(row.total || 0) / maxCategoria) * 100, 2);
      doc.fillColor(theme.text).font('Helvetica').fontSize(10);
      doc.text(safeText(row.nombre), 45, y, { width: 220 });
      doc.text(String(Number(row.total || 0)), 285, y, { width: 60, align: 'right' });
      doc.rect(360, y + 4, 190, 10).fill('#e2e8f0');
      doc.rect(360, y + 4, Math.max((190 * progress) / 100, 4), 10).fill(theme.accent);
      y += 25;
    });

    y = ensureSpace(doc, y + 10, 160);
    writeSectionTitle(doc, 'Distribución del estado de stock');
    y = drawTableHeader(doc, doc.y + 6, ['Estado', 'Total', 'Nota'], [170, 80, 290]);
    distribucionStock.forEach((row, index) => {
      y = ensureSpace(doc, y, 120);
      if (index % 2 === 0) {
        doc.rect(40, y - 2, 540, 20).fill('#fcfdff');
      }
      const note = row.nombre === 'Sin stock' ? 'Atención inmediata' : row.nombre === 'Bajo stock' ? 'Revisar reposición' : 'Correcto';
      doc.fillColor(theme.text).font('Helvetica').fontSize(10);
      doc.text(safeText(row.nombre), 45, y, { width: 160 });
      doc.text(String(Number(row.total || 0)), 230, y, { width: 70, align: 'right' });
      doc.fillColor(row.nombre === 'Sin stock' ? theme.danger : row.nombre === 'Bajo stock' ? theme.warning : theme.success).font('Helvetica-Bold').text(note, 320, y, { width: 230 });
      doc.font('Helvetica');
      y += 25;
    });

    y = ensureSpace(doc, y + 10, 220);
    writeSectionTitle(doc, 'Listado de productos que necesitan reordenar');
    y = drawTableHeader(doc, doc.y + 6, ['SKU', 'Producto', 'Categoría', 'Stock Actual', 'Stock Mínimo', 'Faltante'], [80, 170, 120, 65, 65, 40]);
    reorderList.forEach((row, index) => {
      y = ensureSpace(doc, y, 110);
      if (index % 2 === 0) {
        doc.rect(40, y - 2, 540, 20).fill('#fcfdff');
      }
      doc.fillColor(theme.text).font('Helvetica').fontSize(10);
      doc.text(safeText(row.sku || '-'), 45, y, { width: 70 });
      doc.text(safeText(row.nombre), 125, y, { width: 165 });
      doc.text(safeText(row.categoria), 300, y, { width: 115 });
      doc.text(String(Number(row.stock_actual || 0)), 425, y, { width: 55, align: 'right' });
      doc.text(String(Number(row.stock_minimo || 0)), 485, y, { width: 55, align: 'right' });
      doc.fillColor(theme.danger).font('Helvetica-Bold').text(String(Number(row.faltante || 0)), 540, y, { width: 40, align: 'right' });
      doc.font('Helvetica');
      y += 25;
    });

    doc.moveDown(2);
    doc.moveTo(40, doc.y + 4).lineTo(doc.page.width - 40, doc.y + 4).lineWidth(1).stroke(theme.border);
    doc.fontSize(9).fillColor(theme.muted).text('Este informe es para uso exclusivo de la gerencia de inventario.', 40, doc.page.height - 40, { align: 'center', width: doc.page.width - 80 });
    finishPdf(doc);
  } catch (error: any) {
    if (!res.headersSent) {
      const doc = createPdfDoc(res, `reporte-gestion-inventario-error-${Date.now()}.pdf`);
      writeHeader(doc, 'Reporte de gestión de inventario', 'Se generó una versión básica de respaldo');
      doc.font('Helvetica').fontSize(10).fillColor(theme.text).text('No se pudo generar la versión avanzada del reporte.');
      doc.text(`Detalle técnico: ${error?.message || 'Error interno del servidor'}`);
      finishPdf(doc);
    }
  }
};
