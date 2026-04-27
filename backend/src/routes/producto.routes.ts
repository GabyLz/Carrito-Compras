import { Router } from 'express';
import { ProductoController } from '../controllers/producto.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';

const router = Router();
const ctrl = new ProductoController();

// Rutas públicas
router.get('/', ctrl.listar);
router.get('/categorias', ctrl.categorias);
router.get('/marcas', ctrl.marcas);
router.get('/:id', ctrl.obtener);
router.get('/:id/resenas', ctrl.resenasPublicas);
router.get('/:id/relacionados', ctrl.relacionados);

// Rutas protegidas (admin / gerente inventario)
router.post('/', authenticateJWT, requirePermission('productos', 'crear'), ctrl.crear);
router.put('/:id', authenticateJWT, requirePermission('productos', 'editar'), ctrl.actualizar);
router.delete('/:id', authenticateJWT, requirePermission('productos', 'eliminar'), ctrl.eliminar);

// Rutas de categorías
router.post('/categorias', authenticateJWT, requirePermission('categorias_marcas', 'crear'), ctrl.crearCategoria);
router.put('/categorias/:id', authenticateJWT, requirePermission('categorias_marcas', 'editar'), ctrl.actualizarCategoria);
router.delete('/categorias/:id', authenticateJWT, requirePermission('categorias_marcas', 'eliminar'), ctrl.eliminarCategoria);

// Rutas de marcas
router.post('/marcas', authenticateJWT, requirePermission('categorias_marcas', 'crear'), ctrl.crearMarca);
router.put('/marcas/:id', authenticateJWT, requirePermission('categorias_marcas', 'editar'), ctrl.actualizarMarca);
router.delete('/marcas/:id', authenticateJWT, requirePermission('categorias_marcas', 'eliminar'), ctrl.eliminarMarca);

export default router;