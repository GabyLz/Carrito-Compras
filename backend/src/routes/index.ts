import { Router } from 'express';
import authRoutes from './auth.routes';
import productoRoutes from './producto.routes';
import carritoRoutes from './carrito.routes';
import ordenRoutes from './orden.routes';
import inventarioRoutes from './inventario.routes';
import clienteRoutes from './cliente.routes';
import reporteRoutes from './reporte.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/productos', productoRoutes);
router.use('/carrito', carritoRoutes);
router.use('/ordenes', ordenRoutes);
router.use('/inventario', inventarioRoutes);
router.use('/clientes', clienteRoutes);
router.use('/admin/reportes', reporteRoutes);

export default router;
