import prisma from '../lib/prisma';

export interface ResumenTotales {
  subtotal: number;
  subtotalBase: number;
  impuestoPorcentaje: number;
  impuesto: number;
  envio: number;
  descuento: number;
  total: number;
  cupon: any | null;
  alerts: Array<{ id_item: number; tipo: 'stock' | 'precio'; mensaje: string }>;
}

export class CalculoService {
  /**
   * Unifica la lógica de cálculo de totales para carrito y órdenes.
   * @param items Items del carrito con producto y variante incluidos
   * @param couponCode Código de cupón opcional
   * @param metodoEnvioId ID del método de envío seleccionado (opcional)
   */
  async calcularTotales(items: any[], couponCode?: string, metodoEnvioId?: number): Promise<ResumenTotales> {
    const alerts: Array<{ id_item: number; tipo: 'stock' | 'precio'; mensaje: string }> = [];
    let subtotal = 0;
    const ahora = new Date();

    for (const item of items) {
      const p = item.producto;
      let precioActual = Number(p.precio_venta);
      const stockDisponible = Number(item.variante?.stock ?? p.stock_general ?? 0);

      // 1. Lógica de Oferta Activa
      if (p.precio_oferta && p.fecha_inicio_oferta && p.fecha_fin_oferta) {
        const inicio = new Date(p.fecha_inicio_oferta);
        const fin = new Date(p.fecha_fin_oferta);
        if (ahora >= inicio && ahora <= fin) {
          precioActual = Number(p.precio_oferta);
        }
      } else if (p.precio_oferta && !p.fecha_inicio_oferta && !p.fecha_fin_oferta) {
        precioActual = Number(p.precio_oferta);
      }

      // 2. Ajuste por Variante
      const precioBaseConVariante = precioActual + Number(item.variante?.precio_ajuste || 0);
      
      // 3. Subtotal por Item (Redondeado a 2 decimales para evitar errores de coma flotante)
      const subtotalItem = Number((precioBaseConVariante * item.cantidad).toFixed(2));
      subtotal += subtotalItem;

      // Alertas de stock
      if (item.cantidad > stockDisponible) {
        alerts.push({
          id_item: item.id,
          tipo: 'stock',
          mensaje: `${item.producto.nombre}: stock insuficiente (${stockDisponible} disponible).`,
        });
      }
    }

    const [configImpuesto, configEnvioGratis] = await Promise.all([
      prisma.configuracion_sistema.findUnique({ where: { clave: 'impuesto_general' } }),
      prisma.configuracion_sistema.findUnique({ where: { clave: 'envio_gratis_desde' } }),
    ]);
    const impuestoPorcentaje = Number(configImpuesto?.valor || 18);
    const envioGratisDesde = Number(configEnvioGratis?.valor || 250);

    // 5. Descuento por Cupón (Se aplica sobre el subtotal)
    let descuento = 0;
    let cuponAplicado = null;
    if (couponCode) {
      const cupon = await prisma.ord_cupones.findFirst({
        where: {
          codigo: { equals: couponCode, mode: 'insensitive' },
          activo: true,
          fecha_inicio: { lte: ahora },
          fecha_fin: { gte: ahora },
        },
      });

      if (cupon) {
        const usosActuales = Number(cupon.usos_actuales || 0);
        const usosMaximos = cupon.usos_maximos === null ? null : Number(cupon.usos_maximos);
        const disponible = usosMaximos === null ? true : usosActuales < usosMaximos;
        const montoMinimo = Number(cupon.monto_minimo || 0);
        if (disponible && subtotal >= montoMinimo) {
          const valor = Number(cupon.valor);
          descuento = cupon.tipo === 'porcentaje' ? Number((subtotal * (valor / 100)).toFixed(2)) : valor;
          cuponAplicado = cupon;
        }
      }
    }

    // 6. Envío (gratis desde configuración, sino costo del método o 18 por defecto)
    let envioBase = 18;
    if (typeof metodoEnvioId === 'number' && Number.isFinite(metodoEnvioId)) {
      const metodo = await prisma.ord_metodos_envio.findUnique({ where: { id: metodoEnvioId } });
      if (metodo) envioBase = Number(metodo.costo);
    }
    const envio = subtotal >= envioGratisDesde ? 0 : Number(envioBase.toFixed(2));

    // 7. Impuestos (18% configurable) se calcula sobre el subtotal luego del descuento
    const baseImponible = Number(Math.max(subtotal - descuento, 0).toFixed(2));
    const subtotalBase = baseImponible;
    const impuesto = Number((baseImponible * (impuestoPorcentaje / 100)).toFixed(2));

    // 8. Total Final
    const total = Number((baseImponible + impuesto + envio).toFixed(2));

    return {
      subtotal: Number(subtotal.toFixed(2)),
      subtotalBase,
      impuestoPorcentaje,
      impuesto,
      envio,
      descuento,
      total,
      cupon: cuponAplicado,
      alerts,
    };
  }
}
