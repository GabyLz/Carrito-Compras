import { Request, Response } from 'express';
import { ProveedorService } from '../services/proveedor.service';

export class ProveedorController {
  private service: ProveedorService;

  constructor() {
    this.service = new ProveedorService();
  }

  getAll = async (req: Request, res: Response) => {
    try {
      const proveedores = await this.service.getAllProveedores();
      res.json(proveedores);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const proveedor = await this.service.getProveedorById(id);
      res.json(proveedor);
    } catch (error: any) {
      res.status(error.message === 'Proveedor no encontrado' ? 404 : 500).json({ message: error.message });
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const proveedor = await this.service.createProveedor(req.body);
      res.status(201).json(proveedor);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const proveedor = await this.service.updateProveedor(id, req.body);
      res.json(proveedor);
    } catch (error: any) {
      res.status(error.message === 'Proveedor no encontrado' ? 404 : 400).json({ message: error.message });
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await this.service.deleteProveedor(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(error.message === 'Proveedor no encontrado' ? 404 : 500).json({ message: error.message });
    }
  };
}
