import { Router } from 'express';
import { ClienteController } from '../controllers/cliente.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { rbacMiddleware } from '../middlewares/rbac.middleware';

const router = Router();
const controller = new ClienteController();

router.use(authMiddleware);

router.get('/perfil', controller.getPerfil.bind(controller));
router.put('/perfil', controller.updatePerfil.bind(controller));

router.get('/direcciones', controller.getDirecciones.bind(controller));
router.post('/direcciones', controller.createDireccion.bind(controller));

router.get('/wishlist', controller.getWishlist.bind(controller));
router.post('/wishlist', controller.addWishlist.bind(controller));
router.delete('/wishlist/:idProducto', controller.removeWishlist.bind(controller));

router.get('/resenas/mis', controller.getMisResenas.bind(controller));
router.post('/resenas', controller.createResena.bind(controller));

router.get('/', rbacMiddleware(['ADMIN', 'GERENTE_VENTAS', 'VENDEDOR']), controller.getClientes.bind(controller));

export default router;
