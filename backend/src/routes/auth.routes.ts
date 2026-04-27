import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';

const router = Router();
const ctrl = new AuthController();

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.post('/refresh', ctrl.refresh);

export default router;
