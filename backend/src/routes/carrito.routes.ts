import { Router } from 'express';
import { CarritoController } from '../controllers/carrito.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();
const ctrl = new CarritoController();

router.use(authenticateJWT);
router.get('/', ctrl.getCarrito.bind(ctrl));
router.get('/resumen', ctrl.getResumen.bind(ctrl));
router.post('/sync-local', ctrl.syncLocal.bind(ctrl));
router.post('/aplicar-cupon', ctrl.applyCupon.bind(ctrl));
router.post('/items', ctrl.addItem.bind(ctrl));
router.put('/items/:itemId', ctrl.updateItem.bind(ctrl));
router.delete('/items/:itemId', ctrl.removeItem.bind(ctrl));
router.delete('/', ctrl.clearCarrito.bind(ctrl));

export default router;