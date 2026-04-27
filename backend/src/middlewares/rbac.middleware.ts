import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: ['*'],
  GERENTE_VENTAS: [
    'dashboard.ver',
    'estadisticas.ver',
    'ordenes.leer',
    'ordenes.cambiar_estado',
    'ordenes.devoluciones',
    'clientes.leer',
    'cupones.leer',
    'cupones.crear',
    'cupones.editar',
    'reportes.operacional',
    'reportes.gestion',
    'facturas.generar',
  ],
  GERENTE_INVENTARIO: [
    'dashboard.ver',
    'estadisticas.ver',
    'productos.leer',
    'productos.crear',
    'productos.editar',
    'productos.eliminar',
    'categorias.leer',
    'categorias.crear',
    'categorias.editar',
    'categorias.eliminar',
    'marcas.leer',
    'marcas.crear',
    'marcas.editar',
    'marcas.eliminar',
    'inventario.leer',
    'inventario.ajustar',
    'inventario.movimientos',
    'proveedores.leer',
    'proveedores.crear',
    'proveedores.editar',
    'ordenes_compra.leer',
    'ordenes_compra.crear',
    'ordenes_compra.editar',
    'reportes.operacional',
    'reportes.gestion',
  ],
  VENDEDOR: ['ordenes.leer', 'ordenes.cambiar_estado', 'clientes.leer', 'productos.leer', 'inventario.leer', 'reportes.operacional', 'facturas.generar'],
  CLIENTE: ['productos.leer', 'ordenes.leer', 'clientes.leer'],
};

const normalizeRole = (role?: string) =>
  (role || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');

const getRequiredPermissions = (resource: string, action: string) => {
  if (resource === 'categorias_marcas') {
    return [`categorias.${action}`, `marcas.${action}`];
  }
  return [`${resource}.${action}`];
};

export const rbacMiddleware = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const userRole = normalizeRole(req.user.rol);
    const allowed = allowedRoles.map((role) => role.toUpperCase());
    if (!allowed.includes(userRole)) {
      return res.status(403).json({ message: 'No tienes permisos para realizar esta acción' });
    }

    next();
  };
};

// requirePermission can be a more granular version if needed, 
// but for now let's map it to rbacMiddleware for simplicity
export const requirePermission = (resource: string, action: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const role = normalizeRole(req.user.rol);
    const permissions = ROLE_PERMISSIONS[role] || [];
    const requiredPermissions = getRequiredPermissions(resource, action);

    if (permissions.includes('*') || requiredPermissions.some((permission) => permissions.includes(permission))) {
      return next();
    }

    res.status(403).json({ message: `No tienes permiso para ${action} en ${resource}` });
  };
};
