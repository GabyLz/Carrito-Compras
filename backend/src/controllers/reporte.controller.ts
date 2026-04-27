import { Request, Response } from 'express';
import { generatePDF } from '../utils/pdfGenerator';
import { generateInventoryStockReport, generateManagementReport } from '../utils/pdfGestion';
import prisma from '../lib/prisma';

export class ReporteController {
  async getReportes(req: Request, res: Response) {
    try {
      const tipo = String(req.query.tipo || 'ordenes');
      const categoriaStr = req.query.categoria ? String(req.query.categoria) : undefined;
      const categoria = categoriaStr ? Number(categoriaStr) : undefined;
      const desdeStr = req.query.desde ? String(req.query.desde) : undefined;
      const hastaStr = req.query.hasta ? String(req.query.hasta) : undefined;

      if (categoriaStr && (!Number.isInteger(categoria) || Number(categoria) <= 0)) {
        return res.status(400).json({
          success: false,
          message: 'El parámetro categoria debe ser un número entero positivo.',
        });
      }

      const desde = desdeStr && !isNaN(Date.parse(desdeStr)) ? new Date(desdeStr) : undefined;
      const hasta = hastaStr && !isNaN(Date.parse(hastaStr)) ? new Date(hastaStr) : undefined;

      // Fetch data BEFORE starting the PDF stream to avoid headersSent issues
      let data: any = null;
      const categoriaObj = categoria
        ? await prisma.cat_categorias.findUnique({
            where: { id: categoria },
            select: { nombre: true },
          })
        : null;

      if (tipo === 'ordenes') {
        data = await prisma.ord_ordenes.findMany({
          where: {
            ...(desde || hasta
              ? { fecha: { ...(desde ? { gte: desde } : {}), ...(hasta ? { lte: hasta } : {}) } }
              : {}),
          },
          include: {
            cliente: true,
            estado: true,
            items: { include: { producto: true } },
          },
          orderBy: { fecha: 'desc' },
          take: 200,
        });
      } else if (tipo === 'inventario_actual') {
        data = await prisma.cat_productos.findMany({
          where: {
            estado_producto: 'activo',
            ...(categoria ? { id_categoria: categoria } : {}),
          },
          include: {
            categoria: true,
          },
          orderBy: { nombre: 'asc' },
        });
      } else if (tipo === 'inventario_valorizado') {
        data = await prisma.cat_productos.findMany({
          where: {
            estado_producto: 'activo',
            ...(categoria ? { id_categoria: categoria } : {}),
          },
          include: {
            categoria: true,
            marca: true,
          },
          orderBy: { nombre: 'asc' },
        });
      } else if (tipo === 'movimientos_inventario') {
        data = await prisma.inv_movimientos_inventario.findMany({
          where: {
            ...(desde || hasta
              ? { fecha: { ...(desde ? { gte: desde } : {}), ...(hasta ? { lte: hasta } : {}) } }
              : {}),
          },
          include: {
            producto: true,
          },
          orderBy: { fecha: 'desc' },
          take: 300,
        });
      } else if (tipo === 'stock_bajo') {
        data = await prisma.cat_productos.findMany({
          where: {
            estado_producto: 'activo',
            stock_general: { lte: 10 },
          },
          include: {
            categoria: true,
          },
          orderBy: { stock_general: 'asc' },
          take: 300,
        });
      } else if (tipo === 'pagos') {
        data = await prisma.ord_pagos.findMany({
          where: {
            ...(desde || hasta
              ? { creado: { ...(desde ? { gte: desde } : {}), ...(hasta ? { lte: hasta } : {}) } }
              : {}),
          },
          include: {
            orden: { include: { cliente: true } },
          },
          orderBy: { creado: 'desc' },
        });
      } else if (tipo === 'devoluciones') {
        data = await prisma.ord_devoluciones.findMany({
          where: {
            ...(desde || hasta
              ? { fecha_solicitud: { ...(desde ? { gte: desde } : {}), ...(hasta ? { lte: hasta } : {}) } }
              : {}),
          },
          include: {
            orden: { include: { cliente: true } },
          },
          orderBy: { fecha_solicitud: 'desc' },
        });
      }

      // Now start the PDF
      const doc = generatePDF();
      res.contentType('application/pdf');
      doc.pipe(res);

      doc.rect(0, 0, doc.page.width, 70).fill('#0f172a');
      doc.fillColor('#ffffff').fontSize(20).text('Commerce Suite', 40, 22);
      doc.fontSize(10).text('Reporte operacional empresarial', 40, 42);
      doc.fillColor('#111827');
      doc.moveDown(2);
      doc.fontSize(16).fillColor('#0f172a').text(`Reporte operacional: ${tipo}`);
      doc.fontSize(10).fillColor('#475569').text(`Generado: ${new Date().toLocaleString()}`);
      if (desde || hasta || categoria) {
        doc.text(`Filtros -> desde: ${desde ? desde.toLocaleDateString() : '-'} | hasta: ${hasta ? hasta.toLocaleDateString() : '-'} | categoria: ${categoriaObj?.nombre || categoria || 'todas'}`);
      }
      doc.moveDown();

      if (tipo === 'ordenes') {
        const ordenes = data;
        if (!ordenes || ordenes.length === 0) {
          doc.text('No se encontraron ordenes en este periodo.');
        } else {
          // Table Header
          const startX = 40;
          let currentY = doc.y + 10;
          const colWidths = [60, 180, 100, 100, 100];
          const headers = ['ID', 'Cliente', 'Fecha', 'Total', 'Estado'];

          doc.rect(startX, currentY, 540, 20).fill('#f1f5f9');
          doc.fillColor('#475569').fontSize(10);
          
          let tempX = startX + 5;
          headers.forEach((h, i) => {
            doc.text(h, tempX, currentY + 5);
            tempX += colWidths[i];
          });

          currentY += 25;
          doc.fillColor('#1e293b');

          ordenes.forEach((o: any, index: number) => {
            if (currentY > 700) {
              doc.addPage();
              currentY = 40;
            }

            if (index % 2 === 0) {
              doc.rect(startX, currentY - 2, 540, 20).fill('#f8fafc');
            }
            
            doc.fillColor('#1e293b');
            doc.text(String(o.id), startX + 5, currentY);
            doc.text(`${o.cliente?.nombre || ''} ${o.cliente?.apellido || ''}`, startX + 65, currentY, { width: 170 });
            doc.text(o.fecha ? new Date(o.fecha).toLocaleDateString() : '-', startX + 245, currentY);
            doc.text(`S/ ${Number(o.total).toFixed(2)}`, startX + 345, currentY);
            doc.text(o.estado?.nombre || '-', startX + 445, currentY);

            currentY += 25;
          });
        }
      } else if (tipo === 'inventario_actual') {
        const productos = data;
        if (!productos || productos.length === 0) {
          doc.text('No se encontraron productos para el inventario actual.');
        } else {
          const startX = 40;
          let currentY = doc.y + 10;
          const colWidths = [95, 185, 80, 80, 100];
          const headers = ['SKU', 'Producto', 'Stock', 'Costo Unit.', 'Valor Total'];

          doc.rect(startX, currentY, 540, 20).fill('#f1f5f9');
          doc.fillColor('#475569').fontSize(10);

          let tempX = startX + 5;
          headers.forEach((h, i) => {
            doc.text(h, tempX, currentY + 5);
            tempX += colWidths[i];
          });

          currentY += 25;
          let totalValor = 0;

          productos.forEach((p: any, index: number) => {
            const stock = Number(p.stock_general || 0);
            const costo = Number(p.precio_costo || 0);
            const valor = stock * costo;
            totalValor += valor;

            if (currentY > 700) {
              doc.addPage();
              currentY = 40;
            }

            if (index % 2 === 0) {
              doc.rect(startX, currentY - 2, 540, 20).fill('#f8fafc');
            }

            doc.fillColor('#1e293b');
            doc.text(p.sku || '-', startX + 5, currentY, { width: 90 });
            doc.text(p.nombre, startX + 100, currentY, { width: 175 });
            doc.text(String(stock), startX + 285, currentY);
            doc.text(`S/ ${costo.toFixed(2)}`, startX + 365, currentY);
            doc.text(`S/ ${valor.toFixed(2)}`, startX + 445, currentY);

            currentY += 25;
          });

          doc.moveDown().fontSize(13).fillColor('#0f172a').text(`Valor total del inventario: S/ ${totalValor.toFixed(2)}`, { align: 'right' });
        }
      } else if (tipo === 'inventario_valorizado') {
        const productos = data;
        if (!productos || productos.length === 0) {
          doc.text('No se encontraron productos.');
        } else {
          const startX = 40;
          let currentY = doc.y + 10;
          const colWidths = [200, 100, 120, 120];
          const headers = ['Producto', 'Stock', 'Costo Unit.', 'Valor Total'];

          doc.rect(startX, currentY, 540, 20).fill('#f1f5f9');
          doc.fillColor('#475569').fontSize(10);
          
          let tempX = startX + 5;
          headers.forEach((h, i) => {
            doc.text(h, tempX, currentY + 5);
            tempX += colWidths[i];
          });

          currentY += 25;
          let totalValor = 0;

          productos.forEach((p: any, index: number) => {
            const valor = (p.stock_general || 0) * (Number(p.precio_costo) || 0);
            totalValor += valor;

            if (currentY > 700) {
              doc.addPage();
              currentY = 40;
            }

            if (index % 2 === 0) {
              doc.rect(startX, currentY - 2, 540, 20).fill('#f8fafc');
            }

            doc.fillColor('#1e293b');
            doc.text(p.nombre, startX + 5, currentY, { width: 190 });
            doc.text(String(p.stock_general), startX + 205, currentY);
            doc.text(`S/ ${Number(p.precio_costo).toFixed(2)}`, startX + 305, currentY);
            doc.text(`S/ ${valor.toFixed(2)}`, startX + 425, currentY);

            currentY += 25;
          });

          doc.moveDown().fontSize(13).fillColor('#0f172a').text(`Valor total del inventario: S/ ${totalValor.toFixed(2)}`, { align: 'right' });
        }
      } else if (tipo === 'movimientos_inventario') {
        const movs = data;
        if (!movs || movs.length === 0) {
          doc.text('No se encontraron movimientos.');
        } else {
          const startX = 40;
          let currentY = doc.y + 10;
          const colWidths = [110, 150, 80, 60, 140];
          const headers = ['Fecha', 'Producto', 'Tipo', 'Cant.', 'Motivo'];

          doc.rect(startX, currentY, 540, 20).fill('#f1f5f9');
          doc.fillColor('#475569').fontSize(10);
          
          let tempX = startX + 5;
          headers.forEach((h, i) => {
            doc.text(h, tempX, currentY + 5);
            tempX += colWidths[i];
          });

          currentY += 25;

          movs.forEach((m: any, index: number) => {
            if (currentY > 700) {
              doc.addPage();
              currentY = 40;
            }

            if (index % 2 === 0) {
              doc.rect(startX, currentY - 2, 540, 20).fill('#f8fafc');
            }

            doc.fillColor('#1e293b');
            doc.text(new Date(m.fecha).toLocaleString(), startX + 5, currentY, { width: 100 });
            doc.text(m.producto?.nombre || '-', startX + 115, currentY, { width: 140 });
            doc.text(m.tipo, startX + 265, currentY);
            doc.text(String(m.cantidad), startX + 345, currentY);
            doc.text(m.motivo || '-', startX + 405, currentY, { width: 130 });

            currentY += 25;
          });
        }
      } else if (tipo === 'stock_bajo') {
        const productos = data;
        if (!productos || productos.length === 0) {
          doc.text('No hay productos con stock bajo.');
        } else {
          const startX = 40;
          let currentY = doc.y + 10;
          const colWidths = [240, 150, 150];
          const headers = ['Producto', 'Categoría', 'Stock Actual'];

          doc.rect(startX, currentY, 540, 20).fill('#f1f5f9');
          doc.fillColor('#475569').fontSize(10);
          
          let tempX = startX + 5;
          headers.forEach((h, i) => {
            doc.text(h, tempX, currentY + 5);
            tempX += colWidths[i];
          });

          currentY += 25;

          productos.forEach((p: any, index: number) => {
            if (currentY > 700) {
              doc.addPage();
              currentY = 40;
            }

            if (index % 2 === 0) {
              doc.rect(startX, currentY - 2, 540, 20).fill('#f8fafc');
            }

            doc.fillColor(p.stock_general === 0 ? '#ef4444' : '#f59e0b');
            doc.text(p.nombre, startX + 5, currentY, { width: 230 });
            doc.text(p.categoria?.nombre || '-', startX + 245, currentY);
            doc.text(String(p.stock_general), startX + 395, currentY);

            currentY += 25;
          });
        }
      } else if (tipo === 'pagos') {
        const pagos = data;
        if (!pagos || pagos.length === 0) {
          doc.text('No se encontraron pagos.');
        } else {
          const startX = 40;
          let currentY = doc.y + 10;
          const colWidths = [110, 80, 150, 100, 100];
          const headers = ['Fecha', 'Orden', 'Cliente', 'Monto', 'Estado'];

          doc.rect(startX, currentY, 540, 20).fill('#f1f5f9');
          doc.fillColor('#475569').fontSize(10);
          
          let tempX = startX + 5;
          headers.forEach((h, i) => {
            doc.text(h, tempX, currentY + 5);
            tempX += colWidths[i];
          });

          currentY += 25;

          pagos.forEach((p: any, index: number) => {
            if (currentY > 700) {
              doc.addPage();
              currentY = 40;
            }

            if (index % 2 === 0) {
              doc.rect(startX, currentY - 2, 540, 20).fill('#f8fafc');
            }

            doc.fillColor('#1e293b');
            doc.text(new Date(p.creado).toLocaleString(), startX + 5, currentY, { width: 100 });
            doc.text(`#${p.id_orden}`, startX + 115, currentY);
            doc.text(p.orden?.cliente?.nombre || '-', startX + 195, currentY, { width: 140 });
            doc.text(`S/ ${Number(p.monto).toFixed(2)}`, startX + 345, currentY);
            doc.text(p.estado || '-', startX + 445, currentY);

            currentY += 25;
          });
        }
      } else if (tipo === 'devoluciones') {
        const devs = data;
        if (!devs || devs.length === 0) {
          doc.text('No se encontraron devoluciones.');
        } else {
          const startX = 40;
          let currentY = doc.y + 10;
          const colWidths = [110, 80, 150, 100, 100];
          const headers = ['Fecha', 'Orden', 'Cliente', 'Reembolso', 'Estado'];

          doc.rect(startX, currentY, 540, 20).fill('#f1f5f9');
          doc.fillColor('#475569').fontSize(10);
          
          let tempX = startX + 5;
          headers.forEach((h, i) => {
            doc.text(h, tempX, currentY + 5);
            tempX += colWidths[i];
          });

          currentY += 25;

          devs.forEach((d: any, index: number) => {
            if (currentY > 700) {
              doc.addPage();
              currentY = 40;
            }

            if (index % 2 === 0) {
              doc.rect(startX, currentY - 2, 540, 20).fill('#f8fafc');
            }

            doc.fillColor('#1e293b');
            doc.text(new Date(d.fecha_solicitud).toLocaleDateString(), startX + 5, currentY);
            doc.text(`#${d.id_orden}`, startX + 115, currentY);
            doc.text(d.orden?.cliente?.nombre || '-', startX + 195, currentY, { width: 140 });
            doc.text(`S/ ${Number(d.monto_reembolsado).toFixed(2)}`, startX + 345, currentY);
            doc.text(d.estado || '-', startX + 445, currentY);

            currentY += 25;
          });
        }
      } else {
        doc.fontSize(11).fillColor('#334155').text('Tipo no soportado.');
      }

      doc.moveDown();
      doc.fontSize(9).fillColor('#64748b').text(`Generado: ${new Date().toLocaleString()}`);
      doc.end();
    } catch (error: any) {
      console.error('Error en reporte operacional:', error);
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          message: 'No se pudo generar el reporte operacional',
          detail: error?.message || 'Error interno del servidor',
        });
      }

      return undefined;
    }
  }

  async getGestionReport(req: Request, res: Response) {
    const tipo = String(req.query.tipo || '');
    if (tipo === 'inventario_stock') {
      return generateInventoryStockReport(req, res);
    }
    return generateManagementReport(req, res);
  }
}
