import { Request, Response, NextFunction } from 'express';
import { ProductoService } from '../services/producto.service';
import { z } from 'zod';

const productoSchema = z.object({
  sku: z.string().min(3),
  nombre: z.string().min(3),
  descripcion_corta: z.string().optional().nullable(),
  descripcion_larga: z.string().optional().nullable(),
  precio_venta: z.number().positive(),
  precio_costo: z.number().positive(),
  stock_general: z.number().int().min(0),
  stock_minimo: z.number().int().min(0),
  id_categoria: z.number().int().optional().nullable(),
  id_marca: z.number().int().optional().nullable(),
  estado_producto: z.string().optional().default('activo'),
  imagen_url: z.string().url().optional().nullable(),
});

const categoriaSchema = z.object({
  nombre: z.string().min(2),
  descripcion: z.string().optional().nullable(),
});

const marcaSchema = z.object({
  nombre: z.string().min(2),
  logo_url: z.string().optional().nullable(),
});

export class ProductoController {
  private service = new ProductoService();

  listar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 12;
      const filters = {
        search: (req.query.search as string) || '',
        categoriaId: req.query.categoriaId ? parseInt(req.query.categoriaId as string) : undefined,
        marcaId: req.query.marcaId ? parseInt(req.query.marcaId as string) : undefined,
        minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
        sortBy: (req.query.sortBy as string) || 'fecha_desc',
      };
      const result = await this.service.listarProductos(page, limit, filters);
      res.json({ success: true, data: result.data, total: result.total, page, limit });
    } catch (err) {
      next(err);
    }
  };

  obtener = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const producto = await this.service.obtenerProducto(id);
      res.json({ success: true, data: producto });
    } catch (err) {
      next(err);
    }
  };

  crear = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = productoSchema.parse(req.body);
      const nuevo = await this.service.crearProducto(validated);
      res.status(201).json({ success: true, data: nuevo });
    } catch (err) {
      next(err);
    }
  };

  actualizar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const data = productoSchema.partial().parse(req.body);
      const actualizado = await this.service.actualizarProducto(id, data);
      res.json({ success: true, data: actualizado });
    } catch (err) {
      next(err);
    }
  };

  eliminar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      await this.service.eliminarProducto(id);
      res.json({ success: true, message: 'Producto eliminado (desactivado)' });
    } catch (err) {
      next(err);
    }
  };

  resenasPublicas = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const producto = await this.service.obtenerProducto(id);
      if (!producto) return res.status(404).json({ message: 'Producto no encontrado' });
      res.json({ success: true, data: producto.resenas || [] });
    } catch (err) {
      next(err);
    }
  };

  relacionados = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const producto = await this.service.obtenerProducto(id);
      if (!producto?.id_categoria) return res.json({ success: true, data: [] });
      const relacionados = await this.service.obtenerRelacionados(producto.id_categoria, producto.id);
      res.json({ success: true, data: relacionados });
    } catch (err) {
      next(err);
    }
  };

  categorias = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const categorias = await this.service.listarCategorias();
      res.json({ success: true, data: categorias });
    } catch (err) {
      next(err);
    }
  };

  crearCategoria = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = categoriaSchema.parse(req.body);
      const nuevo = await this.service.crearCategoria(validated);
      res.status(201).json({ success: true, data: nuevo });
    } catch (err) {
      next(err);
    }
  };

  actualizarCategoria = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const validated = categoriaSchema.partial().parse(req.body);
      const actualizado = await this.service.actualizarCategoria(id, validated);
      res.json({ success: true, data: actualizado });
    } catch (err) {
      next(err);
    }
  };

  eliminarCategoria = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      await this.service.eliminarCategoria(id);
      res.json({ success: true, message: 'Categoría eliminada' });
    } catch (err) {
      next(err);
    }
  };

  marcas = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const marcas = await this.service.listarMarcas();
      res.json({ success: true, data: marcas });
    } catch (err) {
      next(err);
    }
  };

  crearMarca = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = marcaSchema.parse(req.body);
      const nuevo = await this.service.crearMarca(validated);
      res.status(201).json({ success: true, data: nuevo });
    } catch (err) {
      next(err);
    }
  };

  actualizarMarca = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const validated = marcaSchema.partial().parse(req.body);
      const actualizado = await this.service.actualizarMarca(id, validated);
      res.json({ success: true, data: actualizado });
    } catch (err) {
      next(err);
    }
  };

  eliminarMarca = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      await this.service.eliminarMarca(id);
      res.json({ success: true, message: 'Marca eliminada' });
    } catch (err) {
      next(err);
    }
  };
}