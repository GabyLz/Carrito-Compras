import { Router } from 'express';
import { CuponController } from '../controllers/cupon.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';

const router = Router();
const ctrl = new CuponController();

router.get('/', authenticateJWT, requirePermission('cupones', 'leer'), ctrl.list.bind(ctrl));
router.post('/', authenticateJWT, requirePermission('cupones', 'crear'), ctrl.create.bind(ctrl));
router.put('/:id', authenticateJWT, requirePermission('cupones', 'editar'), ctrl.update.bind(ctrl));
router.delete('/:id', authenticateJWT, requirePermission('cupones', 'eliminar'), ctrl.delete.bind(ctrl));
router.post('/validar', authenticateJWT, ctrl.validar.bind(ctrl));

export default router;
