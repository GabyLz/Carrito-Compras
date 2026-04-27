import { ProveedorRepository } from '../repositories/proveedor.repo';

export class ProveedorService {
  private repository: ProveedorRepository;

  constructor() {
    this.repository = new ProveedorRepository();
  }

  async getAllProveedores() {
    return this.repository.findAll();
  }

  async getProveedorById(id: number) {
    const proveedor = await this.repository.findById(id);
    if (!proveedor) {
      throw new Error('Proveedor no encontrado');
    }
    return proveedor;
  }

  async createProveedor(data: any) {
    return this.repository.create(data);
  }

  async updateProveedor(id: number, data: any) {
    await this.getProveedorById(id);
    return this.repository.update(id, data);
  }

  async deleteProveedor(id: number) {
    await this.getProveedorById(id);
    return this.repository.delete(id);
  }
}
