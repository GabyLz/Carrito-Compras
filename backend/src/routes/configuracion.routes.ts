import { Router } from 'express';
import { ConfiguracionController } from '../controllers/configuracion.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';

const router = Router();
const ctrl = new ConfiguracionController();

router.get('/public', ctrl.getPublic.bind(ctrl));

router.get('/admin', authenticateJWT, requirePermission('configuracion', 'ver'), ctrl.getAdmin.bind(ctrl));
router.put('/admin', authenticateJWT, requirePermission('configuracion', 'editar'), ctrl.updateAdmin.bind(ctrl));

export default router;
