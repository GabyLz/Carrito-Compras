import { Router } from 'express';
import { CuentaPagarController } from '../controllers/cuenta-pagar.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';

const router = Router();
const controller = new CuentaPagarController();

router.use(authenticateJWT);

router.get('/', requirePermission('inventario', 'leer'), controller.getAll);
router.get('/:id', requirePermission('inventario', 'leer'), controller.getById);
router.put('/:id', requirePermission('inventario', 'ajustar'), controller.update);
router.delete('/:id', requirePermission('inventario', 'ajustar'), controller.delete);

export default router;
