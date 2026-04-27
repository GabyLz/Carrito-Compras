import { Router } from 'express';
import { UsuarioController } from '../controllers/usuario.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { rbacMiddleware } from '../middlewares/rbac.middleware';

const router = Router();
const ctrl = new UsuarioController();

router.use(authMiddleware, rbacMiddleware(['ADMIN', 'GERENTE_INVENTARIO']));

router.get('/', ctrl.listar.bind(ctrl));
router.get('/roles', ctrl.listarRoles.bind(ctrl));
router.post('/roles', ctrl.crearRol.bind(ctrl));
router.get('/:id', ctrl.obtener.bind(ctrl));
router.put('/:id', ctrl.actualizar.bind(ctrl));
router.post('/register-internal', ctrl.crearInterno.bind(ctrl));

export default router;
