import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate';
import * as ctrl from '../controllers/helpdesk.controller';
import { UserRole } from '@prisma/client';

const router = Router();
router.use(authenticate);

// Categories
router.get('/categories', ctrl.listCategories);
router.post('/categories', authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR_MANAGER), ctrl.createCategory);

// Tickets
router.get('/tickets/me', ctrl.getMyTickets);
router.get('/tickets', authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR_MANAGER), ctrl.listTickets);
router.post('/tickets', ctrl.createTicket);
router.get('/tickets/analytics', authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR_MANAGER), ctrl.getAnalytics);
router.get('/tickets/:id', ctrl.getTicket);
router.patch('/tickets/:id/status', authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR_MANAGER), ctrl.updateStatus);
router.post('/tickets/:id/comments', ctrl.addComment);
router.post('/tickets/:id/csat', ctrl.submitCsat);

// Knowledge Base
router.get('/kb/articles', ctrl.searchArticles);
router.post('/kb/articles', authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR_MANAGER), ctrl.createArticle);
router.get('/kb/articles/:id', ctrl.viewArticle);
router.post('/kb/articles/:id/rate', ctrl.rateArticle);

export default router;
