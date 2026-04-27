export type Role =
  | 'INVITADO'
  | 'CLIENTE'
  | 'ADMIN'
  | 'GERENTE_VENTAS'
  | 'GERENTE_INVENTARIO'
  | 'VENDEDOR';

export type ModuleKey =
  | 'dashboard'
  | 'productos'
  | 'categorias_marcas'
  | 'inventario'
  | 'ordenes'
  | 'clientes'
  | 'cupones'
  | 'reportes'
  | 'estadisticas'
  | 'usuarios_roles'
  | 'configuracion'
  | 'facturas';

export const normalizeRole = (role?: string | null): Role => {
  if (!role) return 'INVITADO';
  
  // Limpieza básica
  const clean = role.trim().toUpperCase();
  
  // Mapeo exacto primero
  if (clean === 'ADMIN') return 'ADMIN';
  if (clean === 'GERENTE_VENTAS') return 'GERENTE_VENTAS';
  if (clean === 'GERENTE_INVENTARIO') return 'GERENTE_INVENTARIO';
  if (clean === 'VENDEDOR') return 'VENDEDOR';
  if (clean === 'CLIENTE') return 'CLIENTE';

  // Búsqueda por subcadena si no es exacto
  const normalized = clean
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');

  if (normalized.includes('ADMIN')) return 'ADMIN';
  if (normalized.includes('VENTAS')) return 'GERENTE_VENTAS';
  if (normalized.includes('INVENTARIO')) return 'GERENTE_INVENTARIO';
  if (normalized.includes('VENDEDOR')) return 'VENDEDOR';
  if (normalized.includes('CLIENTE')) return 'CLIENTE';
  
  return 'INVITADO';
};

export const canAccessAdmin = (role?: string | null) => normalizeRole(role) === 'ADMIN';

const STAFF_ROLES: Role[] = ['ADMIN', 'GERENTE_VENTAS', 'GERENTE_INVENTARIO', 'VENDEDOR'];

const MODULE_ACCESS: Record<Exclude<Role, 'INVITADO' | 'CLIENTE'>, ModuleKey[]> = {
  ADMIN: [
    'dashboard',
    'productos',
    'categorias_marcas',
    'inventario',
    'ordenes',
    'clientes',
    'cupones',
    'reportes',
    'estadisticas',
    'usuarios_roles',
    'configuracion',
    'facturas',
  ],
  GERENTE_VENTAS: ['dashboard', 'ordenes', 'clientes', 'cupones', 'reportes', 'estadisticas', 'facturas'],
  GERENTE_INVENTARIO: ['dashboard', 'productos', 'categorias_marcas', 'inventario', 'reportes', 'estadisticas'],
  VENDEDOR: ['ordenes', 'clientes', 'productos', 'inventario', 'facturas', 'reportes'],
};

export const isStaffRole = (role?: string | null) => STAFF_ROLES.includes(normalizeRole(role));

export const canAccessModule = (role: string | null | undefined, module: ModuleKey) => {
  const normalized = normalizeRole(role);
  if (normalized === 'INVITADO' || normalized === 'CLIENTE') return false;
  return MODULE_ACCESS[normalized].includes(module);
};

export const getDefaultRouteByRole = (role?: string | null) => {
  const normalized = normalizeRole(role);
  if (normalized === 'ADMIN') return '/admin/dashboard';
  if (normalized === 'GERENTE_VENTAS') return '/admin/dashboard';
  if (normalized === 'GERENTE_INVENTARIO') return '/admin/dashboard';
  if (normalized === 'VENDEDOR') return '/admin/ordenes';
  return '/catalogo';
};