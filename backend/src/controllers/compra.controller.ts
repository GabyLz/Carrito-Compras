import { Request, Response } from 'express';
import { CompraService } from '../services/compra.service';

export class CompraController {
  private service: CompraService;

  constructor() {
    this.service = new CompraService();
  }

  getAll = async (req: Request, res: Response) => {
    try {
      const ordenes = await this.service.getAllOrdenes();
      res.json(ordenes);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const orden = await this.service.getOrdenById(id);
      res.json(orden);
    } catch (error: any) {
      res.status(error.message === 'Orden de compra no encontrada' ? 404 : 500).json({ message: error.message });
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const orden = await this.service.createOrden(req.body);
      res.status(201).json(orden);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  updateStatus = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { estado } = req.body;
      const orden = await this.service.updateStatus(id, estado);
      res.json(orden);
    } catch (error: any) {
      res.status(error.message === 'Orden de compra no encontrada' ? 404 : 400).json({ message: error.message });
    }
  };

  registrarRecepcion = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const result = await this.service.registrarRecepcion(id);
      res.json(result);
    } catch (error: any) {
      res.status(error.message === 'Orden de compra no encontrada' ? 404 : 400).json({ message: error.message });
    }
  };
}
