import { Router } from 'express';
import { ReporteController } from '../controllers/reporte.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { rbacMiddleware } from '../middlewares/rbac.middleware';

const router = Router();
const controller = new ReporteController();

router.get('/operacional', authMiddleware, rbacMiddleware(['ADMIN', 'GERENTE_VENTAS', 'GERENTE_INVENTARIO', 'VENDEDOR']), controller.getReportes);
router.get('/gestion', authMiddleware, rbacMiddleware(['ADMIN', 'GERENTE_VENTAS', 'GERENTE_INVENTARIO']), controller.getGestionReport);

export default router;
