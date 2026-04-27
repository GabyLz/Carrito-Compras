-- ============================================================
-- CREACIÓN DE BASE DE DATOS (si no existe)
-- ============================================================
CREATE DATABASE ecommerce_db
    WITH
    ENCODING = 'UTF8'
    LC_COLLATE = 'es_ES.UTF-8'
    LC_CTYPE = 'es_ES.UTF-8'
    OWNER = postgres;

\connect ecommerce_db;

-- Extensión para UUID (opcional)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- MÓDULO CATÁLOGO
-- ============================================================

CREATE TABLE IF NOT EXISTS cat_categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,  -- AÑADIDO UNIQUE
    descripcion TEXT,
    id_categoria_padre INT REFERENCES cat_categorias(id) ON DELETE SET NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE cat_categorias IS 'Categorías jerárquicas de productos';
CREATE INDEX idx_cat_categorias_padre ON cat_categorias(id_categoria_padre);
CREATE INDEX idx_cat_categorias_activo ON cat_categorias(activo);

CREATE TABLE IF NOT EXISTS cat_marcas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    logo_url TEXT,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS cat_unidades_medida (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,  -- AÑADIDO UNIQUE
    abreviatura VARCHAR(10) NOT NULL
);

CREATE TABLE IF NOT EXISTS cat_atributos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    tipo VARCHAR(20) CHECK (tipo IN ('texto','numero','booleano','fecha')) DEFAULT 'texto'
);

CREATE TABLE IF NOT EXISTS cat_valores_atributo (
    id SERIAL PRIMARY KEY,
    id_atributo INT NOT NULL REFERENCES cat_atributos(id) ON DELETE CASCADE,
    valor VARCHAR(255) NOT NULL,
    UNIQUE (id_atributo, valor)
);

CREATE TABLE IF NOT EXISTS cat_productos (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(200) NOT NULL,
    descripcion_corta TEXT,
    descripcion_larga TEXT,
    precio_costo DECIMAL(12,2) NOT NULL CHECK (precio_costo >= 0),
    precio_venta DECIMAL(12,2) NOT NULL CHECK (precio_venta >= 0),
    precio_oferta DECIMAL(12,2) CHECK (precio_oferta IS NULL OR precio_oferta >= 0),
    fecha_inicio_oferta DATE,
    fecha_fin_oferta DATE,
    stock_general INT NOT NULL DEFAULT 0 CHECK (stock_general >= 0),
    stock_minimo INT NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
    peso DECIMAL(8,2),
    dimensiones JSONB,
    id_marca INT REFERENCES cat_marcas(id) ON DELETE SET NULL,
    id_categoria INT REFERENCES cat_categorias(id) ON DELETE SET NULL,
    id_unidad_medida INT REFERENCES cat_unidades_medida(id),
    estado_producto VARCHAR(20) DEFAULT 'activo' CHECK (estado_producto IN ('activo','inactivo','borrador')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT oferta_check CHECK (precio_oferta IS NULL OR precio_oferta < precio_venta),
    CONSTRAINT fechas_oferta CHECK (fecha_inicio_oferta IS NULL OR fecha_fin_oferta IS NULL OR fecha_inicio_oferta <= fecha_fin_oferta)
);
COMMENT ON TABLE cat_productos IS 'Productos base (sin variantes)';
CREATE INDEX idx_cat_productos_sku ON cat_productos(sku);
CREATE INDEX idx_cat_productos_nombre ON cat_productos(nombre);
CREATE INDEX idx_cat_productos_estado ON cat_productos(estado_producto);
CREATE INDEX idx_cat_productos_precio ON cat_productos(precio_venta);

CREATE TABLE IF NOT EXISTS cat_producto_variante (
    id SERIAL PRIMARY KEY,
    id_producto INT NOT NULL REFERENCES cat_productos(id) ON DELETE CASCADE,
    sku VARCHAR(50) NOT NULL UNIQUE,
    nombre_variante VARCHAR(100) NOT NULL,
    precio_ajuste DECIMAL(10,2) DEFAULT 0,
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    imagen_url TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE cat_producto_variante IS 'Variantes de producto (talla, color, etc.)';
CREATE INDEX idx_variante_producto ON cat_producto_variante(id_producto);
CREATE INDEX idx_variante_sku ON cat_producto_variante(sku);

CREATE TABLE IF NOT EXISTS cat_variante_atributo (
    id SERIAL PRIMARY KEY,
    id_variante INT NOT NULL REFERENCES cat_producto_variante(id) ON DELETE CASCADE,
    id_valor_atributo INT NOT NULL REFERENCES cat_valores_atributo(id) ON DELETE CASCADE,
    UNIQUE (id_variante, id_valor_atributo)
);

CREATE TABLE IF NOT EXISTS cat_imagenes_producto (
    id SERIAL PRIMARY KEY,
    id_producto INT REFERENCES cat_productos(id) ON DELETE CASCADE,
    id_variante INT REFERENCES cat_producto_variante(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    orden INT DEFAULT 0,
    CHECK (num_nonnulls(id_producto, id_variante) = 1),
    UNIQUE (id_producto, orden),
    UNIQUE (id_variante, orden)
);
CREATE INDEX idx_imagenes_producto ON cat_imagenes_producto(id_producto);
CREATE INDEX idx_imagenes_variante ON cat_imagenes_producto(id_variante);

CREATE TABLE IF NOT EXISTS cat_etiquetas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS cat_producto_etiqueta (
    id SERIAL PRIMARY KEY,
    id_producto INT NOT NULL REFERENCES cat_productos(id) ON DELETE CASCADE,
    id_etiqueta INT NOT NULL REFERENCES cat_etiquetas(id) ON DELETE CASCADE,
    UNIQUE (id_producto, id_etiqueta)
);

-- ============================================================
-- MÓDULO CLIENTES
-- ============================================================

CREATE TABLE IF NOT EXISTS cli_clientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100),
    email VARCHAR(150) NOT NULL UNIQUE,
    email_verificado BOOLEAN DEFAULT FALSE,
    telefono VARCHAR(20),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recibir_promociones BOOLEAN DEFAULT TRUE,
    activo BOOLEAN DEFAULT TRUE
);
COMMENT ON TABLE cli_clientes IS 'Clientes del e-commerce';
CREATE INDEX idx_cli_clientes_email ON cli_clientes(email);
CREATE INDEX idx_cli_clientes_fecha_registro ON cli_clientes(fecha_registro);

CREATE TABLE IF NOT EXISTS cli_direcciones (
    id SERIAL PRIMARY KEY,
    id_cliente INT NOT NULL REFERENCES cli_clientes(id) ON DELETE CASCADE,
    nombre_destinatario VARCHAR(100),
    calle VARCHAR(255) NOT NULL,
    numero VARCHAR(20),
    complemento VARCHAR(100),
    ciudad VARCHAR(100),
    provincia VARCHAR(100),
    codigo_postal VARCHAR(20),
    pais VARCHAR(100) DEFAULT 'España',
    telefono_contacto VARCHAR(20),
    principal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_direcciones_cliente ON cli_direcciones(id_cliente);

CREATE TABLE IF NOT EXISTS cli_lista_deseos (
    id SERIAL PRIMARY KEY,
    id_cliente INT NOT NULL REFERENCES cli_clientes(id) ON DELETE CASCADE,
    creado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id_cliente)
);

CREATE TABLE IF NOT EXISTS cli_items_lista_deseos (
    id SERIAL PRIMARY KEY,
    id_lista_deseos INT NOT NULL REFERENCES cli_lista_deseos(id) ON DELETE CASCADE,
    id_producto INT NOT NULL REFERENCES cat_productos(id) ON DELETE CASCADE,
    id_variante INT REFERENCES cat_producto_variante(id) ON DELETE CASCADE,
    agregado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id_lista_deseos, id_producto, id_variante)
);

CREATE TABLE IF NOT EXISTS cli_resenas_producto (
    id SERIAL PRIMARY KEY,
    id_cliente INT NOT NULL REFERENCES cli_clientes(id) ON DELETE CASCADE,
    id_producto INT NOT NULL REFERENCES cat_productos(id) ON DELETE CASCADE,
    id_variante INT REFERENCES cat_producto_variante(id) ON DELETE SET NULL,
    calificacion INT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
    comentario TEXT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id_cliente, id_producto, id_variante)
);
CREATE INDEX idx_resenas_producto ON cli_resenas_producto(id_producto);

CREATE TABLE IF NOT EXISTS cli_historial_navegacion (
    id SERIAL PRIMARY KEY,
    id_cliente INT NOT NULL REFERENCES cli_clientes(id) ON DELETE CASCADE,
    id_producto INT NOT NULL REFERENCES cat_productos(id) ON DELETE CASCADE,
    fecha_visita TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_historial_cliente ON cli_historial_navegacion(id_cliente);

-- ============================================================
-- MÓDULO CARRITO Y ÓRDENES
-- ============================================================

CREATE TABLE IF NOT EXISTS ord_carritos (
    id SERIAL PRIMARY KEY,
    id_cliente INT NOT NULL REFERENCES cli_clientes(id) ON DELETE CASCADE,
    creado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id_cliente)
);

CREATE TABLE IF NOT EXISTS ord_items_carrito (
    id SERIAL PRIMARY KEY,
    id_carrito INT NOT NULL REFERENCES ord_carritos(id) ON DELETE CASCADE,
    id_producto INT NOT NULL REFERENCES cat_productos(id) ON DELETE CASCADE,
    id_variante INT REFERENCES cat_producto_variante(id) ON DELETE SET NULL,
    cantidad INT NOT NULL CHECK (cantidad > 0),
    UNIQUE (id_carrito, id_producto, id_variante)
);

CREATE TABLE IF NOT EXISTS ord_estados_orden (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS ord_metodos_envio (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,  -- AÑADIDO UNIQUE
    costo DECIMAL(10,2) NOT NULL CHECK (costo >= 0),
    tiempo_estimado VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS ord_metodos_pago (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS ord_cupones (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('porcentaje', 'fijo')),
    valor DECIMAL(10,2) NOT NULL CHECK (valor > 0),
    monto_minimo DECIMAL(10,2) DEFAULT 0,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    usos_maximos INT,
    usos_actuales INT DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (fecha_inicio <= fecha_fin)
);
CREATE INDEX idx_cupones_codigo ON ord_cupones(codigo);
CREATE INDEX idx_cupones_vigencia ON ord_cupones(fecha_inicio, fecha_fin);

CREATE TABLE IF NOT EXISTS ord_ordenes (
    id SERIAL PRIMARY KEY,
    id_cliente INT NOT NULL REFERENCES cli_clientes(id) ON DELETE RESTRICT,
    id_direccion_envio INT NOT NULL REFERENCES cli_direcciones(id),
    id_estado INT NOT NULL REFERENCES ord_estados_orden(id),
    id_metodo_envio INT REFERENCES ord_metodos_envio(id),
    id_metodo_pago INT REFERENCES ord_metodos_pago(id),
    id_cupon_aplicado INT REFERENCES ord_cupones(id) ON DELETE SET NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    descuento DECIMAL(12,2) DEFAULT 0,
    impuestos DECIMAL(12,2) DEFAULT 0,
    costo_envio DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(12,2) NOT NULL CHECK (total >= 0),
    numero_guia VARCHAR(100),
    transportista VARCHAR(100),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_ordenes_cliente ON ord_ordenes(id_cliente);
CREATE INDEX idx_ordenes_fecha ON ord_ordenes(fecha);
CREATE INDEX idx_ordenes_estado ON ord_ordenes(id_estado);
CREATE INDEX idx_ordenes_guia ON ord_ordenes(numero_guia);
CREATE INDEX idx_ordenes_fecha_estado ON ord_ordenes(fecha, id_estado);

CREATE TABLE IF NOT EXISTS ord_items_orden (
    id SERIAL PRIMARY KEY,
    id_orden INT NOT NULL REFERENCES ord_ordenes(id) ON DELETE CASCADE,
    id_producto INT NOT NULL REFERENCES cat_productos(id),
    id_variante INT REFERENCES cat_producto_variante(id) ON DELETE SET NULL,
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL
);
CREATE INDEX idx_items_orden ON ord_items_orden(id_orden);
CREATE INDEX idx_items_producto ON ord_items_orden(id_producto);

CREATE TABLE IF NOT EXISTS ord_pagos (
    id SERIAL PRIMARY KEY,
    id_orden INT NOT NULL REFERENCES ord_ordenes(id) ON DELETE CASCADE,
    monto DECIMAL(12,2) NOT NULL,
    id_metodo_pago INT REFERENCES ord_metodos_pago(id),
    referencia_externa VARCHAR(100),
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aprobado','rechazado','reembolsado')),
    creado TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ord_transacciones_pago (
    id SERIAL PRIMARY KEY,
    id_pago INT NOT NULL REFERENCES ord_pagos(id) ON DELETE CASCADE,
    respuesta JSONB,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ord_historial_estados (
    id SERIAL PRIMARY KEY,
    id_orden INT NOT NULL REFERENCES ord_ordenes(id) ON DELETE CASCADE,
    id_estado INT NOT NULL REFERENCES ord_estados_orden(id),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    comentario TEXT,
    id_usuario INT
);
CREATE INDEX idx_historial_orden ON ord_historial_estados(id_orden);

CREATE TABLE IF NOT EXISTS ord_devoluciones (
    id SERIAL PRIMARY KEY,
    id_orden INT NOT NULL REFERENCES ord_ordenes(id) ON DELETE RESTRICT,
    motivo TEXT NOT NULL,
    estado VARCHAR(20) DEFAULT 'solicitada' CHECK (estado IN ('solicitada','aprobada','rechazada','completada')),
    monto_reembolsado DECIMAL(12,2),
    fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_resolucion TIMESTAMP,
    comentario_administrador TEXT
);
CREATE INDEX idx_devoluciones_orden ON ord_devoluciones(id_orden);

CREATE TABLE IF NOT EXISTS ord_devolucion_items (
    id SERIAL PRIMARY KEY,
    id_devolucion INT NOT NULL REFERENCES ord_devoluciones(id) ON DELETE CASCADE,
    id_item_orden INT NOT NULL REFERENCES ord_items_orden(id) ON DELETE CASCADE,
    cantidad_devuelta INT NOT NULL CHECK (cantidad_devuelta > 0)
);

-- ============================================================
-- MÓDULO INVENTARIO
-- ============================================================

CREATE TABLE IF NOT EXISTS inv_almacenes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,  -- AÑADIDO UNIQUE
    ubicacion VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS inv_proveedores (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL UNIQUE,  -- AÑADIDO UNIQUE
    contacto VARCHAR(100),
    telefono VARCHAR(20),
    email VARCHAR(150)
);

CREATE TABLE IF NOT EXISTS inv_stock_producto (
    id SERIAL PRIMARY KEY,
    id_producto INT REFERENCES cat_productos(id) ON DELETE CASCADE,
    id_variante INT REFERENCES cat_producto_variante(id) ON DELETE CASCADE,
    id_almacen INT NOT NULL REFERENCES inv_almacenes(id) ON DELETE CASCADE,
    cantidad INT NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
    CHECK (num_nonnulls(id_producto, id_variante) = 1),
    UNIQUE (id_producto, id_variante, id_almacen)
);
CREATE INDEX idx_stock_producto ON inv_stock_producto(id_producto);
CREATE INDEX idx_stock_variante ON inv_stock_producto(id_variante);
CREATE INDEX idx_stock_almacen ON inv_stock_producto(id_almacen);

CREATE TABLE IF NOT EXISTS inv_reservas_stock (
    id SERIAL PRIMARY KEY,
    id_producto INT REFERENCES cat_productos(id) ON DELETE CASCADE,
    id_variante INT REFERENCES cat_producto_variante(id) ON DELETE CASCADE,
    id_almacen INT NOT NULL REFERENCES inv_almacenes(id),
    cantidad INT NOT NULL CHECK (cantidad > 0),
    session_id VARCHAR(255) NOT NULL,
    fecha_expiracion TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_reservas_expiracion ON inv_reservas_stock(fecha_expiracion);
CREATE INDEX idx_reservas_session ON inv_reservas_stock(session_id);

CREATE TABLE IF NOT EXISTS inv_movimientos_inventario (
    id SERIAL PRIMARY KEY,
    id_producto INT REFERENCES cat_productos(id) ON DELETE CASCADE,
    id_variante INT REFERENCES cat_producto_variante(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada','salida','ajuste','reserva','liberacion')),
    cantidad INT NOT NULL,
    motivo TEXT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_usuario INT
);
CREATE INDEX idx_movimientos_producto ON inv_movimientos_inventario(id_producto);
CREATE INDEX idx_movimientos_fecha ON inv_movimientos_inventario(fecha);

CREATE TABLE IF NOT EXISTS inv_ordenes_compra (
    id SERIAL PRIMARY KEY,
    id_proveedor INT NOT NULL REFERENCES inv_proveedores(id),
    id_almacen INT NOT NULL REFERENCES inv_almacenes(id),
    total DECIMAL(12,2),
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente','enviada','recibida','cancelada')),
    fecha_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_recepcion TIMESTAMP,
    pagado BOOLEAN DEFAULT FALSE,
    fecha_pago TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inv_detalle_orden_compra (
    id SERIAL PRIMARY KEY,
    id_orden_compra INT NOT NULL REFERENCES inv_ordenes_compra(id) ON DELETE CASCADE,
    id_producto INT REFERENCES cat_productos(id),
    id_variante INT REFERENCES cat_producto_variante(id),
    cantidad INT NOT NULL CHECK (cantidad > 0),
    costo_unitario DECIMAL(10,2) NOT NULL,
    CHECK (num_nonnulls(id_producto, id_variante) = 1)
);

CREATE TABLE IF NOT EXISTS inv_recepciones (
    id SERIAL PRIMARY KEY,
    id_orden_compra INT NOT NULL REFERENCES inv_ordenes_compra(id),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(20) DEFAULT 'recibido'
);

CREATE TABLE IF NOT EXISTS inv_ajustes (
    id SERIAL PRIMARY KEY,
    motivo TEXT NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inv_detalle_ajuste (
    id SERIAL PRIMARY KEY,
    id_ajuste INT NOT NULL REFERENCES inv_ajustes(id) ON DELETE CASCADE,
    id_producto INT REFERENCES cat_productos(id),
    id_variante INT REFERENCES cat_producto_variante(id),
    cantidad INT NOT NULL,
    CHECK (num_nonnulls(id_producto, id_variante) = 1)
);

-- ============================================================
-- MÓDULO SEGURIDAD Y TRANSVERSALES
-- ============================================================

CREATE TABLE IF NOT EXISTS seg_roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS seg_permisos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    recurso VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS seg_rol_permiso (
    id SERIAL PRIMARY KEY,
    id_rol INT NOT NULL REFERENCES seg_roles(id) ON DELETE CASCADE,
    id_permiso INT NOT NULL REFERENCES seg_permisos(id) ON DELETE CASCADE,
    UNIQUE (id_rol, id_permiso)
);

CREATE TABLE IF NOT EXISTS seg_usuarios (
    id SERIAL PRIMARY KEY,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    id_cliente INT UNIQUE REFERENCES cli_clientes(id) ON DELETE SET NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_usuarios_email ON seg_usuarios(email);
CREATE INDEX idx_usuarios_cliente ON seg_usuarios(id_cliente);

CREATE TABLE IF NOT EXISTS seg_usuario_rol (
    id SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL REFERENCES seg_usuarios(id) ON DELETE CASCADE,
    id_rol INT NOT NULL REFERENCES seg_roles(id) ON DELETE CASCADE,
    UNIQUE (id_usuario, id_rol)
);

-- Refresh tokens (para JWT)
CREATE TABLE IF NOT EXISTS seg_refresh_tokens (
    id SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL REFERENCES seg_usuarios(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expiracion TIMESTAMP NOT NULL,
    revocado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_refresh_token_hash ON seg_refresh_tokens(token_hash);
CREATE INDEX idx_refresh_usuario ON seg_refresh_tokens(id_usuario);

-- Tokens de verificación y reseteo de contraseña
CREATE TABLE IF NOT EXISTS seg_tokens (
    id SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL REFERENCES seg_usuarios(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('email_verificacion', 'reset_password')),
    expiracion TIMESTAMP NOT NULL,
    usado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_tokens_token ON seg_tokens(token);
CREATE INDEX idx_tokens_usuario ON seg_tokens(id_usuario);

-- Eventos de tracking para embudo de conversión y análisis de comportamiento
CREATE TABLE IF NOT EXISTS seg_eventos_tracking (
    id SERIAL PRIMARY KEY,
    id_cliente INT REFERENCES cli_clientes(id) ON DELETE SET NULL,
    session_id VARCHAR(255) NOT NULL,
    tipo_evento VARCHAR(50) NOT NULL,
    pagina VARCHAR(255),
    id_producto INT REFERENCES cat_productos(id),
    id_variante INT REFERENCES cat_producto_variante(id),
    datos_extra JSONB,
    ip_origen INET,
    user_agent TEXT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_eventos_cliente ON seg_eventos_tracking(id_cliente);
CREATE INDEX idx_eventos_session ON seg_eventos_tracking(session_id);
CREATE INDEX idx_eventos_tipo ON seg_eventos_tracking(tipo_evento);
CREATE INDEX idx_eventos_fecha ON seg_eventos_tracking(fecha);

-- Monedas y tipo de cambio
CREATE TABLE IF NOT EXISTS monedas (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(3) NOT NULL UNIQUE,
    simbolo VARCHAR(5) NOT NULL,
    nombre VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS tipo_cambio (
    id SERIAL PRIMARY KEY,
    id_moneda_origen INT NOT NULL REFERENCES monedas(id),
    id_moneda_destino INT NOT NULL REFERENCES monedas(id),
    tasa DECIMAL(12,6) NOT NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    UNIQUE (id_moneda_origen, id_moneda_destino, fecha)
);

CREATE TABLE IF NOT EXISTS configuracion_sistema (
    id SERIAL PRIMARY KEY,
    clave VARCHAR(100) NOT NULL UNIQUE,
    valor TEXT NOT NULL,
    descripcion TEXT
);

-- Auditoría (con IP y user agent)
CREATE TABLE IF NOT EXISTS auditoria_registro (
    id SERIAL PRIMARY KEY,
    nombre_tabla VARCHAR(100) NOT NULL,
    id_registro INT NOT NULL,
    operacion VARCHAR(10) NOT NULL CHECK (operacion IN ('INSERT','UPDATE','DELETE')),
    datos_previos JSONB,
    datos_nuevos JSONB,
    id_usuario INT REFERENCES seg_usuarios(id) ON DELETE SET NULL,
    ip_origen INET,
    user_agent TEXT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_auditoria_tabla ON auditoria_registro(nombre_tabla, id_registro);
CREATE INDEX idx_auditoria_fecha ON auditoria_registro(fecha);

-- ============================================================
-- FUNCIONES Y TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_cat_categorias_updated_at BEFORE UPDATE ON cat_categorias FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cat_productos_updated_at BEFORE UPDATE ON cat_productos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cat_producto_variante_updated_at BEFORE UPDATE ON cat_producto_variante FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ord_ordenes_updated_at BEFORE UPDATE ON ord_ordenes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_seg_usuarios_updated_at BEFORE UPDATE ON seg_usuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para limpiar reservas expiradas (ejecutar periódicamente)
CREATE OR REPLACE FUNCTION liberar_reservas_expiradas()
RETURNS void AS $$
BEGIN
    DELETE FROM inv_reservas_stock WHERE fecha_expiracion < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- DATOS SEMILLA (INSERTS IDEMPOTENTES)
-- ============================================================

-- Roles (ampliados)
INSERT INTO seg_roles (nombre) VALUES
('ADMIN'),
('GERENTE_VENTAS'),
('GERENTE_INVENTARIO'),
('VENDEDOR'),
('CLIENTE')
ON CONFLICT (nombre) DO NOTHING;

-- Permisos (granulares por recurso y acción)
INSERT INTO seg_permisos (nombre, recurso) VALUES
-- Dashboard y estadísticas
('dashboard.ver', 'dashboard'),
('estadisticas.ver', 'estadisticas'),
-- Productos
('productos.leer', 'productos'),
('productos.crear', 'productos'),
('productos.editar', 'productos'),
('productos.eliminar', 'productos'),
-- Categorías y marcas
('categorias.leer', 'categorias'),
('categorias.crear', 'categorias'),
('categorias.editar', 'categorias'),
('categorias.eliminar', 'categorias'),
('marcas.leer', 'marcas'),
('marcas.crear', 'marcas'),
('marcas.editar', 'marcas'),
('marcas.eliminar', 'marcas'),
-- Inventario
('inventario.leer', 'inventario'),
('inventario.ajustar', 'inventario'),
('inventario.movimientos', 'inventario'),
('proveedores.leer', 'proveedores'),
('proveedores.crear', 'proveedores'),
('proveedores.editar', 'proveedores'),
('ordenes_compra.leer', 'ordenes_compra'),
('ordenes_compra.crear', 'ordenes_compra'),
('ordenes_compra.editar', 'ordenes_compra'),
-- Órdenes de venta
('ordenes.leer', 'ordenes'),
('ordenes.cambiar_estado', 'ordenes'),
('ordenes.cancelar', 'ordenes'),
('ordenes.devoluciones', 'ordenes'),
-- Clientes
('clientes.leer', 'clientes'),
('clientes.editar', 'clientes'),
('clientes.eliminar', 'clientes'),
-- Cupones
('cupones.leer', 'cupones'),
('cupones.crear', 'cupones'),
('cupones.editar', 'cupones'),
('cupones.eliminar', 'cupones'),
-- Reportes
('reportes.operacional', 'reportes'),
('reportes.gestion', 'reportes'),
-- Usuarios y roles (solo admin)
('usuarios.ver', 'usuarios'),
('usuarios.gestion_roles', 'usuarios')
ON CONFLICT (nombre) DO NOTHING;

-- Asignación de permisos por rol (usando IDs dinámicos)
-- Admin: todos los permisos
INSERT INTO seg_rol_permiso (id_rol, id_permiso)
SELECT r.id, p.id FROM seg_roles r, seg_permisos p WHERE r.nombre = 'ADMIN'
ON CONFLICT (id_rol, id_permiso) DO NOTHING;  -- CORREGIDO

-- Gerente de Ventas
DO $$
DECLARE
    rol_id INT;
BEGIN
    SELECT id INTO rol_id FROM seg_roles WHERE nombre = 'GERENTE_VENTAS';
    IF rol_id IS NOT NULL THEN
        INSERT INTO seg_rol_permiso (id_rol, id_permiso)
        SELECT rol_id, id FROM seg_permisos WHERE nombre IN (
            'dashboard.ver', 'estadisticas.ver',
            'ordenes.leer', 'ordenes.cambiar_estado', 'ordenes.cancelar', 'ordenes.devoluciones',
            'clientes.leer',
            'cupones.leer', 'cupones.crear', 'cupones.editar', 'cupones.eliminar',
            'reportes.operacional', 'reportes.gestion'
        ) ON CONFLICT (id_rol, id_permiso) DO NOTHING;  -- CORREGIDO
    END IF;
END $$;

-- Gerente de Inventario
DO $$
DECLARE
    rol_id INT;
BEGIN
    SELECT id INTO rol_id FROM seg_roles WHERE nombre = 'GERENTE_INVENTARIO';
    IF rol_id IS NOT NULL THEN
        INSERT INTO seg_rol_permiso (id_rol, id_permiso)
        SELECT rol_id, id FROM seg_permisos WHERE nombre IN (
            'productos.leer', 'productos.crear', 'productos.editar', 'productos.eliminar',
            'categorias.leer', 'categorias.crear', 'categorias.editar', 'categorias.eliminar',
            'marcas.leer', 'marcas.crear', 'marcas.editar', 'marcas.eliminar',
            'inventario.leer', 'inventario.ajustar', 'inventario.movimientos',
            'proveedores.leer', 'proveedores.crear', 'proveedores.editar',
            'ordenes_compra.leer', 'ordenes_compra.crear', 'ordenes_compra.editar',
            'reportes.operacional'
        ) ON CONFLICT (id_rol, id_permiso) DO NOTHING;  -- CORREGIDO
    END IF;
END $$;

-- Vendedor / Atención al Cliente
DO $$
DECLARE
    rol_id INT;
BEGIN
    SELECT id INTO rol_id FROM seg_roles WHERE nombre = 'VENDEDOR';
    IF rol_id IS NOT NULL THEN
        INSERT INTO seg_rol_permiso (id_rol, id_permiso)
        SELECT rol_id, id FROM seg_permisos WHERE nombre IN (
            'ordenes.leer', 'ordenes.cambiar_estado',
            'clientes.leer',
            'productos.leer',
            'inventario.leer',
            'reportes.operacional'
        ) ON CONFLICT (id_rol, id_permiso) DO NOTHING;  -- CORREGIDO
    END IF;
END $$;

-- Cliente (permisos implícitos en el frontend, pero se pueden definir para coherencia)
DO $$
DECLARE
    rol_id INT;
BEGIN
    SELECT id INTO rol_id FROM seg_roles WHERE nombre = 'CLIENTE';
    IF rol_id IS NOT NULL THEN
        INSERT INTO seg_rol_permiso (id_rol, id_permiso)
        SELECT rol_id, id FROM seg_permisos WHERE nombre IN (
            'productos.leer', 'ordenes.leer', 'clientes.leer'
        ) ON CONFLICT (id_rol, id_permiso) DO NOTHING;  -- CORREGIDO
    END IF;
END $$;

-- Monedas
INSERT INTO monedas (codigo, simbolo, nombre) VALUES
('EUR', '€', 'Euro'),
('USD', '$', 'Dólar estadounidense')
ON CONFLICT (codigo) DO NOTHING;

-- Unidades de medida
INSERT INTO cat_unidades_medida (nombre, abreviatura) VALUES
('Unidad', 'ud'),
('Kilogramo', 'kg'),
('Litro', 'L'),
('Metro', 'm')
ON CONFLICT (nombre) DO NOTHING;

-- Marcas de ejemplo
INSERT INTO cat_marcas (nombre) VALUES
('Nike'), ('Adidas'), ('Sony'), ('Samsung'), ('LG')
ON CONFLICT (nombre) DO NOTHING;

-- Categorías
INSERT INTO cat_categorias (nombre) VALUES
('Electrónica'), ('Ropa'), ('Hogar'), ('Deportes'), ('Libros')
ON CONFLICT (nombre) DO NOTHING;

-- Estados de orden
INSERT INTO ord_estados_orden (nombre) VALUES
('pendiente'), ('pagado'), ('enviado'), ('entregado'), ('cancelado'), ('devuelto')
ON CONFLICT (nombre) DO NOTHING;

-- Métodos de envío
INSERT INTO ord_metodos_envio (nombre, costo, tiempo_estimado) VALUES
('Estándar', 4.99, '3-5 días'),
('Express', 9.99, '1-2 días'),
('Recogida en tienda', 0.00, 'mismo día')
ON CONFLICT (nombre) DO NOTHING;

-- Métodos de pago
INSERT INTO ord_metodos_pago (nombre) VALUES
('Tarjeta crédito/débito'),
('Transferencia bancaria'),
('Contra entrega'),
('PayPal')
ON CONFLICT (nombre) DO NOTHING;

-- Cupón de ejemplo
INSERT INTO ord_cupones (codigo, tipo, valor, monto_minimo, fecha_inicio, fecha_fin, usos_maximos)
VALUES ('BIENVENIDA10', 'porcentaje', 10, 20, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', 100)
ON CONFLICT (codigo) DO NOTHING;

-- Almacén por defecto
INSERT INTO inv_almacenes (nombre, ubicacion) VALUES ('Almacén Central', 'Calle Principal 123')
ON CONFLICT (nombre) DO NOTHING;

-- Proveedor de ejemplo
INSERT INTO inv_proveedores (nombre, contacto, telefono, email) VALUES
('Distribuidora Nacional', 'Juan Pérez', '900123456', 'ventas@distribuidora.com')
ON CONFLICT (nombre) DO NOTHING;

-- Configuración del sistema
INSERT INTO configuracion_sistema (clave, valor, descripcion) VALUES
('impuesto_general', '21', 'IVA estándar en porcentaje'),
('tiempo_maximo_carrito_minutos', '30', 'Tiempo para expirar carrito no pagado'),
('tiempo_reserva_stock_minutos', '15', 'Minutos que dura una reserva de stock en checkout'),
('moneda_por_defecto', 'EUR', 'Código de moneda principal')
ON CONFLICT (clave) DO NOTHING;

-- Cliente de ejemplo
INSERT INTO cli_clientes (nombre, apellido, email, email_verificado, telefono) VALUES
('Cliente', 'Demo', 'demo@example.com', TRUE, '600000000')
ON CONFLICT (email) DO NOTHING;

-- Usuario admin (contraseña: Admin123! - bcrypt hash de ejemplo, costo 10)
INSERT INTO seg_usuarios (email, password_hash, id_cliente) VALUES
('admin@ecommerce.com', '$2b$10$5Z1K5XJqZzBcL3W7WgZ2UO8Yl3Fg5HjK8LmN6QwErTyUiOpAsDfG', NULL)
ON CONFLICT (email) DO NOTHING;

-- Asignar rol admin al usuario admin
INSERT INTO seg_usuario_rol (id_usuario, id_rol)
SELECT u.id, r.id FROM seg_usuarios u, seg_roles r
WHERE u.email = 'admin@ecommerce.com' AND r.nombre = 'ADMIN'
ON CONFLICT (id_usuario, id_rol) DO NOTHING;  -- CORREGIDO

-- Usuario cliente asociado al cliente demo (opcional)
INSERT INTO seg_usuarios (email, password_hash, id_cliente, activo) VALUES
('demo@example.com', '$2b$10$5Z1K5XJqZzBcL3W7WgZ2UO8Yl3Fg5HjK8LmN6QwErTyUiOpAsDfG', (SELECT id FROM cli_clientes WHERE email='demo@example.com'), TRUE)
ON CONFLICT (email) DO NOTHING;

-- Asignar rol cliente
INSERT INTO seg_usuario_rol (id_usuario, id_rol)
SELECT u.id, r.id FROM seg_usuarios u, seg_roles r
WHERE u.email = 'demo@example.com' AND r.nombre = 'CLIENTE'
ON CONFLICT (id_usuario, id_rol) DO NOTHING;  -- CORREGIDO

-- ============================================================
-- USUARIOS DE ACCESO RECOMENDADOS (MISMA CLAVE)
-- Nota: la contraseña en texto plano para todos es: Demo123456!
-- admin.demo@tienda.local / Demo123456!
-- ventas.demo@tienda.local / Demo123456!
-- inventario.demo@tienda.local / Demo123456!
-- vendedor.demo@tienda.local / Demo123456!
-- cliente.demo@tienda.local / Demo123456!
-- Hash bcrypt de Demo123456!: $2a$10$6jzuA9WpYx68Bsjs.fA2a.qr8WBf9RibP4r11pnd6nCNryFwWj7gK
-- ============================================================

INSERT INTO cli_clientes (nombre, apellido, email, email_verificado, telefono) VALUES
('Admin', 'Demo', 'admin.demo@tienda.local', TRUE, '600111111'),
('Gerente', 'Ventas', 'ventas.demo@tienda.local', TRUE, '600222222'),
('Gerente', 'Inventario', 'inventario.demo@tienda.local', TRUE, '600333333'),
('Vendedor', 'Demo', 'vendedor.demo@tienda.local', TRUE, '600444444'),
('Cliente', 'Demo', 'cliente.demo@tienda.local', TRUE, '600555555')
ON CONFLICT (email) DO NOTHING;

INSERT INTO seg_usuarios (email, password_hash, id_cliente, activo) VALUES
('admin.demo@tienda.local', '$2a$10$6jzuA9WpYx68Bsjs.fA2a.qr8WBf9RibP4r11pnd6nCNryFwWj7gK', (SELECT id FROM cli_clientes WHERE email='admin.demo@tienda.local'), TRUE),
('ventas.demo@tienda.local', '$2a$10$6jzuA9WpYx68Bsjs.fA2a.qr8WBf9RibP4r11pnd6nCNryFwWj7gK', (SELECT id FROM cli_clientes WHERE email='ventas.demo@tienda.local'), TRUE),
('inventario.demo@tienda.local', '$2a$10$6jzuA9WpYx68Bsjs.fA2a.qr8WBf9RibP4r11pnd6nCNryFwWj7gK', (SELECT id FROM cli_clientes WHERE email='inventario.demo@tienda.local'), TRUE),
('vendedor.demo@tienda.local', '$2a$10$6jzuA9WpYx68Bsjs.fA2a.qr8WBf9RibP4r11pnd6nCNryFwWj7gK', (SELECT id FROM cli_clientes WHERE email='vendedor.demo@tienda.local'), TRUE),
('cliente.demo@tienda.local', '$2a$10$6jzuA9WpYx68Bsjs.fA2a.qr8WBf9RibP4r11pnd6nCNryFwWj7gK', (SELECT id FROM cli_clientes WHERE email='cliente.demo@tienda.local'), TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO seg_usuario_rol (id_usuario, id_rol)
SELECT u.id, r.id FROM seg_usuarios u, seg_roles r
WHERE u.email = 'admin.demo@tienda.local' AND r.nombre = 'ADMIN'
ON CONFLICT (id_usuario, id_rol) DO NOTHING;

INSERT INTO seg_usuario_rol (id_usuario, id_rol)
SELECT u.id, r.id FROM seg_usuarios u, seg_roles r
WHERE u.email = 'ventas.demo@tienda.local' AND r.nombre = 'GERENTE_VENTAS'
ON CONFLICT (id_usuario, id_rol) DO NOTHING;

INSERT INTO seg_usuario_rol (id_usuario, id_rol)
SELECT u.id, r.id FROM seg_usuarios u, seg_roles r
WHERE u.email = 'inventario.demo@tienda.local' AND r.nombre = 'GERENTE_INVENTARIO'
ON CONFLICT (id_usuario, id_rol) DO NOTHING;

INSERT INTO seg_usuario_rol (id_usuario, id_rol)
SELECT u.id, r.id FROM seg_usuarios u, seg_roles r
WHERE u.email = 'vendedor.demo@tienda.local' AND r.nombre = 'VENDEDOR'
ON CONFLICT (id_usuario, id_rol) DO NOTHING;

INSERT INTO seg_usuario_rol (id_usuario, id_rol)
SELECT u.id, r.id FROM seg_usuarios u, seg_roles r
WHERE u.email = 'cliente.demo@tienda.local' AND r.nombre = 'CLIENTE'
ON CONFLICT (id_usuario, id_rol) DO NOTHING;

-- Productos de ejemplo (20 productos con campos extendidos)
DO $$
DECLARE
    cat_electronica INT; cat_ropa INT; marca_nike INT; marca_sony INT; unidad_ud INT;
BEGIN
    SELECT id INTO cat_electronica FROM cat_categorias WHERE nombre = 'Electrónica' LIMIT 1;
    SELECT id INTO cat_ropa FROM cat_categorias WHERE nombre = 'Ropa' LIMIT 1;
    SELECT id INTO marca_nike FROM cat_marcas WHERE nombre = 'Nike' LIMIT 1;
    SELECT id INTO marca_sony FROM cat_marcas WHERE nombre = 'Sony' LIMIT 1;
    SELECT id INTO unidad_ud FROM cat_unidades_medida WHERE abreviatura = 'ud' LIMIT 1;

    INSERT INTO cat_productos
        (sku, nombre, descripcion_corta, descripcion_larga, precio_costo, precio_venta, precio_oferta, stock_general, stock_minimo, peso, id_marca, id_unidad_medida, estado_producto)
    VALUES
        ('SKU1001', 'Smartphone X100', 'Teléfono de última generación', 'Pantalla 6.5", 128GB, 5G', 500, 699.99, 599.99, 50, 10, 0.2, marca_sony, unidad_ud, 'activo'),
        ('SKU1002', 'Auriculares Bluetooth', 'Cancelación de ruido', 'Hasta 30h de batería', 60, 89.99, NULL, 120, 20, 0.05, marca_sony, unidad_ud, 'activo'),
        ('SKU1003', 'Zapatillas Running', 'Deportivas ligeras', 'Suela amortiguada, transpirables', 50, 79.99, 69.99, 80, 15, 0.8, marca_nike, unidad_ud, 'activo'),
        ('SKU1004', 'Camiseta Deportiva', 'Algodón transpirable', 'Cuello redondo, varias tallas', 15, 24.99, NULL, 200, 30, 0.2, marca_nike, unidad_ud, 'activo'),
        ('SKU1005', 'Monitor 24"', 'Full HD 75Hz', 'IPS, HDMI, VESA', 120, 149.99, 139.99, 25, 5, 3.5, NULL, unidad_ud, 'activo'),
        ('SKU1006', 'Teclado Mecánico', 'RGB switches rojos', 'Anti-ghosting, cable USB', 40, 59.99, NULL, 60, 10, 1.2, NULL, unidad_ud, 'activo'),
        ('SKU1007', 'Ratón Inalámbrico', 'Ergonómico', 'Silencioso, 3 botones', 18, 29.99, NULL, 150, 25, 0.1, NULL, unidad_ud, 'activo'),
        ('SKU1008', 'Mochila Urbana', 'Resistente al agua', '15 litros, acolchada', 25, 45.00, NULL, 40, 8, 0.6, NULL, unidad_ud, 'activo'),
        ('SKU1009', 'Libro "Clean Code"', 'Robert C. Martin', 'Programación ágil', 25, 39.99, 35.99, 30, 5, 0.5, NULL, unidad_ud, 'activo'),
        ('SKU1010', 'Libro "Patrones de Diseño"', 'Gamma et al.', 'GOF', 30, 49.99, NULL, 20, 5, 0.6, NULL, unidad_ud, 'activo'),
        ('SKU1011', 'Smartwatch Pro', 'Monitor cardíaco', 'GPS, notificaciones', 120, 199.99, 179.99, 35, 10, 0.05, marca_nike, unidad_ud, 'activo'),
        ('SKU1012', 'Altavoz Portátil', '20W impermeable', 'Bluetooth 5.0', 35, 59.99, NULL, 70, 15, 0.4, marca_sony, unidad_ud, 'activo'),
        ('SKU1013', 'Gafas de Sol', 'Protección UV', 'Polarizadas', 12, 35.00, NULL, 100, 20, 0.03, NULL, unidad_ud, 'activo'),
        ('SKU1014', 'Botella de Agua', 'Acero inoxidable', '500ml, térmica', 8, 15.99, 12.99, 200, 40, 0.3, NULL, unidad_ud, 'activo'),
        ('SKU1015', 'Cargador Rápido', 'USB-C 65W', 'Carga laptop y móvil', 15, 25.99, NULL, 85, 15, 0.1, NULL, unidad_ud, 'activo'),
        ('SKU1016', 'Funda para Laptop', '15.6" resistente', 'Neopreno', 12, 22.50, NULL, 60, 10, 0.2, NULL, unidad_ud, 'activo'),
        ('SKU1017', 'Lámpara LED', 'Escritorio regulable', 'Temperatura ajustable', 20, 34.99, NULL, 45, 10, 0.5, NULL, unidad_ud, 'activo'),
        ('SKU1018', 'Set de Herramientas', '60 piezas', 'Llaves, destornilladores', 50, 89.99, 79.99, 15, 5, 2.5, NULL, unidad_ud, 'activo'),
        ('SKU1019', 'Juguete Educativo', 'Robótica para niños', 'Arduino compatible', 30, 49.99, NULL, 25, 5, 0.4, NULL, unidad_ud, 'activo'),
        ('SKU1020', 'Café Gourmet', '500g grano', 'Tostado medio', 8, 12.99, NULL, 120, 20, 0.5, NULL, unidad_ud, 'activo')
    ON CONFLICT (sku) DO NOTHING;

    -- Imágenes placeholder (una por producto, orden=1)
    INSERT INTO cat_imagenes_producto (id_producto, url, orden)
    SELECT p.id, 'https://picsum.photos/id/' || (p.id + 100) || '/400/300', 1
    FROM cat_productos p
    WHERE NOT EXISTS (SELECT 1 FROM cat_imagenes_producto WHERE id_producto = p.id)
    ON CONFLICT (id_producto, orden) DO NOTHING;  -- CORREGIDO
END $$;