import { Router } from 'express';
import { CompraController } from '../controllers/compra.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';

const router = Router();
const controller = new CompraController();

router.use(authenticateJWT);

router.get('/', requirePermission('ordenes_compra', 'leer'), controller.getAll);
router.get('/:id', requirePermission('ordenes_compra', 'leer'), controller.getById);
router.post('/', requirePermission('ordenes_compra', 'crear'), controller.create);
router.patch('/:id/estado', requirePermission('ordenes_compra', 'editar'), controller.updateStatus);
router.post('/:id/recibir', requirePermission('ordenes_compra', 'editar'), controller.registrarRecepcion);

export default router;
