import { CuentaPagarRepository } from '../repositories/cuenta-pagar.repo';

export class CuentaPagarService {
  private repository: CuentaPagarRepository;

  constructor() {
    this.repository = new CuentaPagarRepository();
  }

  async getAllCuentas() {
    return this.repository.findAll();
  }

  async getCuentaById(id: number) {
    const cuenta = await this.repository.findById(id);
    if (!cuenta) {
      throw new Error('Cuenta por pagar no encontrada');
    }
    return cuenta;
  }

  async updateCuenta(id: number, data: any) {
    await this.getCuentaById(id);
    
    // Logic to handle partial payments
    if (data.monto_pagado) {
      const cuenta = await this.getCuentaById(id);
      if (Number(data.monto_pagado) >= Number(cuenta.monto_total)) {
        data.estado = 'pagado';
      } else if (Number(data.monto_pagado) > 0) {
        data.estado = 'parcial';
      }
    }

    return this.repository.update(id, data);
  }

  async deleteCuenta(id: number) {
    await this.getCuentaById(id);
    return this.repository.delete(id);
  }
}
