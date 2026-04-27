import { Request, Response } from 'express';
import { CuentaPagarService } from '../services/cuenta-pagar.service';

export class CuentaPagarController {
  private service: CuentaPagarService;

  constructor() {
    this.service = new CuentaPagarService();
  }

  getAll = async (req: Request, res: Response) => {
    try {
      const cuentas = await this.service.getAllCuentas();
      res.json(cuentas);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const cuenta = await this.service.getCuentaById(id);
      res.json(cuenta);
    } catch (error: any) {
      res.status(error.message === 'Cuenta por pagar no encontrada' ? 404 : 500).json({ message: error.message });
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const cuenta = await this.service.updateCuenta(id, req.body);
      res.json(cuenta);
    } catch (error: any) {
      res.status(error.message === 'Cuenta por pagar no encontrada' ? 404 : 400).json({ message: error.message });
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await this.service.deleteCuenta(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(error.message === 'Cuenta por pagar no encontrada' ? 404 : 500).json({ message: error.message });
    }
  };
}
