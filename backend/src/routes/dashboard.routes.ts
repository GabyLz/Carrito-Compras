import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { rbacMiddleware } from '../middlewares/rbac.middleware';

const router = Router();
const controller = new DashboardController();

router.get('/kpis', authMiddleware, rbacMiddleware(['ADMIN', 'GERENTE_VENTAS', 'GERENTE_INVENTARIO']), controller.getKPIs);
router.get('/ventas-categoria', authMiddleware, rbacMiddleware(['ADMIN', 'GERENTE_VENTAS', 'GERENTE_INVENTARIO']), controller.getVentasPorCategoria);
router.get('/data', authMiddleware, rbacMiddleware(['ADMIN', 'GERENTE_VENTAS', 'GERENTE_INVENTARIO']), controller.getDashboardData);

export default router;
