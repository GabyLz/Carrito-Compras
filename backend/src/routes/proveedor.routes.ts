import { Router } from 'express';
import { ProveedorController } from '../controllers/proveedor.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';

const router = Router();
const controller = new ProveedorController();

router.use(authenticateJWT);

router.get('/', requirePermission('proveedores', 'leer'), controller.getAll);
router.get('/:id', requirePermission('proveedores', 'leer'), controller.getById);
router.post('/', requirePermission('proveedores', 'crear'), controller.create);
router.put('/:id', requirePermission('proveedores', 'editar'), controller.update);
router.delete('/:id', requirePermission('proveedores', 'eliminar'), controller.delete);

export default router;
