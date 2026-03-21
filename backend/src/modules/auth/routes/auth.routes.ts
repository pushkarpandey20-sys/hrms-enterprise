import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../../../shared/middleware/authenticate';

const router = Router();

router.post('/login', authController.login);
router.post('/mfa/verify', authController.verifyMfa);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected
router.use(authenticate);
router.get('/profile', authController.getProfile);
router.post('/change-password', authController.changePassword);
router.post('/mfa/setup', authController.setupMfa);
router.post('/mfa/enable', authController.enableMfa);

export default router;
