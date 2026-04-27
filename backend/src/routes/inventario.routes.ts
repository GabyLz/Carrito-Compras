import { Router } from 'express';
import { InventarioController } from '../controllers/inventario.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';

const router = Router();
const ctrl = new InventarioController();

router.use(authenticateJWT);
router.get('/stock', requirePermission('inventario', 'leer'), ctrl.getStock);
router.post('/ajustar', requirePermission('inventario', 'ajustar'), ctrl.ajustarStock);
router.get('/movimientos', requirePermission('inventario', 'leer'), ctrl.getMovimientos);
router.get('/proveedores', requirePermission('proveedores', 'leer'), ctrl.listProveedores);
router.post('/proveedores', requirePermission('proveedores', 'crear'), ctrl.createProveedor);
router.get('/ordenes-compra', requirePermission('ordenes_compra', 'leer'), ctrl.listOrdenesCompra);
router.post('/ordenes-compra', requirePermission('ordenes_compra', 'crear'), ctrl.createOrdenCompra);
router.post('/ordenes-compra/:id/recibir', requirePermission('ordenes_compra', 'editar'), ctrl.recibirOrdenCompra);

export default router;