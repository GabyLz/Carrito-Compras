import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/producto.routes';
import carritoRoutes from './routes/carrito.routes';
import ordenRoutes from './routes/orden.routes';
import clienteRoutes from './routes/cliente.routes';
import dashboardRoutes from './routes/dashboard.routes';
import reporteRoutes from './routes/reporte.routes';
import inventarioRoutes from './routes/inventario.routes';
import cuponRoutes from './routes/cupon.routes';
import estadisticasRoutes from './routes/estadisticas.routes';
import usuarioRoutes from './routes/usuario.routes';
import configuracionRoutes from './routes/configuracion.routes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.toLowerCase();
      const allowedExact = new Set([config.frontendUrl.toLowerCase()]);
      const isVercelOrigin =
        normalizedOrigin.startsWith('https://') && normalizedOrigin.includes('.vercel.app');

      const isLocalDevOrigin =
        normalizedOrigin.startsWith('http://localhost:') || normalizedOrigin.startsWith('http://127.0.0.1:');

      if (config.nodeEnv !== 'production' && isLocalDevOrigin) return callback(null, true);
      if (isVercelOrigin) return callback(null, true);
      if (allowedExact.has(normalizedOrigin)) return callback(null, true);

      return callback(new Error(`CORS bloqueado para el origen: ${origin}`));
    },
  })
);
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/productos', productRoutes);
app.use('/api/v1/carrito', carritoRoutes);
app.use('/api/v1/ordenes', ordenRoutes);
app.use('/api/v1/clientes', clienteRoutes);
app.use('/api/v1/cupones', cuponRoutes);
app.use('/api/v1/inventario', inventarioRoutes);
app.use('/api/v1/admin/dashboard', dashboardRoutes);
app.use('/api/v1/admin/reportes', reporteRoutes);
app.use('/api/v1/admin/estadisticas', estadisticasRoutes);
app.use('/api/v1/admin/usuarios', usuarioRoutes);
app.use('/api/v1/configuracion', configuracionRoutes);

app.use(errorHandler);
export default app;
