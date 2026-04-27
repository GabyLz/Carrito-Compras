import { ProductoRepository } from '../repositories/producto.repo';

export class ProductoService {
  private repo = new ProductoRepository();

  async listarProductos(page: number, limit: number, filters: any) {
    return this.repo.findAll(page, limit, filters);
  }

  async obtenerProducto(id: number) {
    const producto = await this.repo.findById(id);
    if (!producto) throw new Error('Producto no encontrado');
    return producto;
  }

  async obtenerRelacionados(idCategoria: number, excludeId: number) {
    return this.repo.findRelatedByCategory(idCategoria, excludeId);
  }

  async listarCategorias() {
    return this.repo.findCategorias();
  }

  async listarMarcas() {
    return this.repo.findMarcas();
  }

  async crearCategoria(data: { nombre: string; descripcion?: string | null }) {
    return this.repo.createCategoria(data);
  }

  async actualizarCategoria(id: number, data: { nombre?: string; descripcion?: string | null }) {
    return this.repo.updateCategoria(id, data);
  }

  async eliminarCategoria(id: number) {
    return this.repo.deleteCategoria(id);
  }

  async crearMarca(data: { nombre: string; logo_url?: string | null }) {
    return this.repo.createMarca(data);
  }

  async actualizarMarca(id: number, data: { nombre?: string; logo_url?: string | null }) {
    return this.repo.updateMarca(id, data);
  }

  async eliminarMarca(id: number) {
    return this.repo.deleteMarca(id);
  }

  async crearProducto(data: any) {
    // Validaciones de negocio (ej. SKU único, precios)
    return this.repo.create(data);
  }

  async actualizarProducto(id: number, data: any) {
    return this.repo.update(id, data);
  }

  async eliminarProducto(id: number) {
    return this.repo.delete(id);
  }
}
