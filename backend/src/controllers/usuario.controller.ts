import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';

export class UsuarioController {
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const usuarios = await prisma.seg_usuarios.findMany({
        include: {
          roles: {
            include: {
              rol: true
            }
          },
          cliente: true
        },
        orderBy: { id: 'asc' }
      });
      res.json(usuarios);
    } catch (error) {
      next(error);
    }
  }

  async obtener(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      const usuario = await prisma.seg_usuarios.findUnique({
        where: { id },
        include: {
          roles: {
            include: {
              rol: true
            }
          },
          cliente: true
        }
      });
      if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado' });
      res.json(usuario);
    } catch (error) {
      next(error);
    }
  }

  async actualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      const { email, rolId, activo, password } = req.body;

      const updateData: any = {
        email,
        activo
      };

      if (password) {
        updateData.password_hash = await bcrypt.hash(password, 12);
      }

      const usuario = await prisma.seg_usuarios.update({
        where: { id },
        data: updateData
      });

      if (rolId) {
        // Eliminar roles anteriores y asignar el nuevo
        await prisma.seg_usuario_rol.deleteMany({
          where: { id_usuario: id }
        });
        await prisma.seg_usuario_rol.create({
          data: {
            id_usuario: id,
            id_rol: rolId
          }
        });
      }

      res.json({ success: true, data: usuario });
    } catch (error) {
      next(error);
    }
  }

  async crearInterno(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, rolId, activo, nombre, apellido } = req.body;
      
      const existing = await prisma.seg_usuarios.findUnique({ where: { email } });
      if (existing) return res.status(400).json({ error: 'Email ya registrado' });

      const hashed = await bcrypt.hash(password, 12);
      
      // Crear cliente asociado si no existe (opcional para usuarios internos pero bueno tenerlo)
      const cliente = await prisma.cli_clientes.create({
        data: { 
          email, 
          nombre: nombre || email.split('@')[0], 
          apellido: apellido || '',
          activo: activo !== undefined ? activo : true
        }
      });

      const usuario = await prisma.seg_usuarios.create({
        data: { 
          email, 
          password_hash: hashed, 
          id_cliente: cliente.id,
          activo: activo !== undefined ? activo : true
        }
      });

      if (rolId) {
        await prisma.seg_usuario_rol.create({ 
          data: { 
            id_usuario: usuario.id, 
            id_rol: rolId 
          } 
        });
      }

      res.status(201).json({ success: true, data: usuario });
    } catch (error) {
      next(error);
    }
  }

  async listarRoles(req: Request, res: Response, next: NextFunction) {
    try {
      const roles = await prisma.seg_roles.findMany({
        orderBy: { nombre: 'asc' }
      });
      res.json(roles);
    } catch (error) {
      next(error);
    }
  }

  async crearRol(req: Request, res: Response, next: NextFunction) {
    try {
      const { nombre } = req.body;
      if (!nombre) return res.status(400).json({ error: 'El nombre del rol es requerido' });

      const nombreNormalizado = nombre.trim().toUpperCase();

      const existing = await prisma.seg_roles.findUnique({
        where: { nombre: nombreNormalizado }
      });

      if (existing) return res.status(400).json({ error: 'El rol ya existe' });

      const rol = await prisma.seg_roles.create({
        data: {
          nombre: nombreNormalizado,
        }
      });

      res.status(201).json({ success: true, data: rol });
    } catch (error) {
      next(error);
    }
  }
}
