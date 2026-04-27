import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { config } from '../config';

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const { email: rawEmail, password, nombre, apellido } = req.body;
      const email = (rawEmail || '').toLowerCase().trim();
      if (!email || !password) return res.status(400).json({ error: 'Email y contraseña son requeridos' });

      const existing = await prisma.seg_usuarios.findUnique({ where: { email } });
      if (existing) return res.status(400).json({ error: 'Email ya registrado' });

      const hashed = await bcrypt.hash(password, 12);
      
      const cliente = await prisma.cli_clientes.create({
        data: { email, nombre: nombre || email.split('@')[0], apellido: apellido || '' }
      });

      const usuario = await prisma.seg_usuarios.create({
        data: { email, password_hash: hashed, id_cliente: cliente.id }
      });

      // asignar rol cliente por defecto
      const rolCliente = await prisma.seg_roles.findUnique({ where: { nombre: 'CLIENTE' } });
      if (rolCliente) {
        await prisma.seg_usuario_rol.create({ data: { id_usuario: usuario.id, id_rol: rolCliente.id } });
      }

      res.status(201).json({ message: 'Usuario registrado correctamente' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email: rawEmail, password } = req.body;
      const email = (rawEmail || '').toLowerCase().trim();
      if (!email || !password) return res.status(400).json({ error: 'Email y contraseña son requeridos' });

      const usuario = await prisma.seg_usuarios.findUnique({ 
        where: { email }, 
        include: { roles: { include: { rol: true } } } 
      });

      if (!usuario) return res.status(401).json({ error: 'Credenciales inválidas' });
      if (usuario.activo === false) return res.status(403).json({ error: 'Usuario inactivo. Contacte al administrador.' });

      const valid = await bcrypt.compare(password, usuario.password_hash);
      if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });

      const prioridadRoles = ['ADMIN', 'GERENTE_VENTAS', 'GERENTE_INVENTARIO', 'VENDEDOR', 'CLIENTE'];
      const rolesUsuario = usuario.roles.map((entry) => (entry.rol.nombre || '').toUpperCase());
      const rol = prioridadRoles.find((r) => rolesUsuario.includes(r)) || rolesUsuario[0] || 'CLIENTE';
      const accessToken = jwt.sign(
        { id: usuario.id, email: usuario.email, rol }, 
        config.jwt.secret, 
        { expiresIn: config.jwt.expiresIn as any }
      );
      
      const refreshToken = jwt.sign(
        { id: usuario.id }, 
        config.jwt.refreshSecret, 
        { expiresIn: config.jwt.refreshExpiresIn as any }
      );

      const hashedRefresh = await bcrypt.hash(refreshToken, 10);
      await prisma.seg_refresh_tokens.create({
        data: { 
          id_usuario: usuario.id, 
          token_hash: hashedRefresh, 
          expiracion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) 
        }
      });

      res.json({ accessToken, refreshToken, user: { id: usuario.id, email: usuario.email, rol } });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) return res.status(400).json({ error: 'refreshToken es requerido' });

      let payload: any;
      try {
        payload = jwt.verify(refreshToken, config.jwt.refreshSecret);
      } catch {
        return res.status(401).json({ error: 'Refresh token inválido o expirado' });
      }

      const userId = Number(payload?.id);
      if (!userId) return res.status(401).json({ error: 'Refresh token inválido' });

      const candidates = await prisma.seg_refresh_tokens.findMany({
        where: { id_usuario: userId, expiracion: { gt: new Date() }, NOT: { revocado: true } },
        orderBy: { created_at: 'desc' },
        take: 20,
      });

      let matched = false;
      for (const tokenRow of candidates) {
        const ok = await bcrypt.compare(refreshToken, tokenRow.token_hash);
        if (ok) {
          matched = true;
          break;
        }
      }

      if (!matched) return res.status(401).json({ error: 'Refresh token inválido' });

      const usuario = await prisma.seg_usuarios.findUnique({
        where: { id: userId },
        include: { roles: { include: { rol: true } } },
      });

      if (!usuario) return res.status(401).json({ error: 'Usuario no existe' });
      if (usuario.activo === false) return res.status(403).json({ error: 'Usuario inactivo. Contacte al administrador.' });

      const prioridadRoles = ['ADMIN', 'GERENTE_VENTAS', 'GERENTE_INVENTARIO', 'VENDEDOR', 'CLIENTE'];
      const rolesUsuario = usuario.roles.map((entry) => (entry.rol.nombre || '').toUpperCase());
      const rol = prioridadRoles.find((r) => rolesUsuario.includes(r)) || rolesUsuario[0] || 'CLIENTE';

      const accessToken = jwt.sign(
        { id: usuario.id, email: usuario.email, rol },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn as any }
      );

      res.json({ accessToken });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}
