import { Router } from 'express';
import { EstadisticasController } from '../controllers/estadisticas.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { rbacMiddleware } from '../middlewares/rbac.middleware';

const router = Router();
const controller = new EstadisticasController();

router.use(authMiddleware, rbacMiddleware(['ADMIN', 'GERENTE_VENTAS', 'GERENTE_INVENTARIO']));

router.get('/tendencia-ventas', controller.tendenciaVentas.bind(controller));
router.get('/abc-productos', controller.abcProductos.bind(controller));
router.get('/rfm-clientes', controller.rfmClientes.bind(controller));
router.get('/abandono-carrito', controller.abandonoCarrito.bind(controller));
router.get('/cohortes', controller.cohortes.bind(controller));
router.get('/correlacion-descuento', controller.correlacionDescuento.bind(controller));
router.get('/ticket-segmentos', controller.ticketSegmentos.bind(controller));

export default router;
