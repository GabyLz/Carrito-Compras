import { Router } from 'express';
import { OrdenController } from '../controllers/orden.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { rbacMiddleware } from '../middlewares/rbac.middleware';

const router = Router();

const ctrl = new OrdenController();

router.use(authenticateJWT);

router.get('/admin/all', rbacMiddleware(['ADMIN', 'GERENTE_VENTAS', 'VENDEDOR']), ctrl.listAll.bind(ctrl));
router.put('/admin/:id/estado', rbacMiddleware(['ADMIN', 'GERENTE_VENTAS', 'VENDEDOR']), ctrl.updateEstado.bind(ctrl));
router.post('/admin/:id/devolucion', rbacMiddleware(['ADMIN', 'GERENTE_VENTAS']), ctrl.registrarDevolucion.bind(ctrl));

router.post('/', ctrl.createOrden.bind(ctrl));
router.post('/reservar-stock', ctrl.reservarStock.bind(ctrl));
router.post('/liberar-reserva', ctrl.liberarReserva.bind(ctrl));
router.get('/metodos-envio', ctrl.listMetodosEnvio.bind(ctrl));
router.get('/mis', ctrl.getMisOrdenes.bind(ctrl));
router.get('/:id/factura', ctrl.descargarFactura.bind(ctrl));
router.get('/:id/comprobante', ctrl.descargarComprobante.bind(ctrl));
router.get('/:id', ctrl.getOrdenById.bind(ctrl));
router.post('/:id/cancelar', ctrl.cancelarOrden.bind(ctrl));

export default router;
