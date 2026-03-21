import { Router } from 'express';
import { payrollController } from '../controllers/payroll.controller';
import { authenticate, authorize } from '../../../shared/middleware/authenticate';

const router = Router();
router.use(authenticate);

router.get('/my-payslips', payrollController.getMyPayslips);
router.get('/payslip/:payslipId/download', payrollController.downloadPayslip);
router.post('/run', authorize('HR_ADMIN', 'SUPER_ADMIN'), payrollController.runPayroll);
router.get('/runs', authorize('HR_ADMIN', 'SUPER_ADMIN'), payrollController.getPayrollRuns);
router.get('/runs/:runId/payslips', authorize('HR_ADMIN', 'SUPER_ADMIN'), payrollController.getPayslips);
router.post('/runs/:runId/email', authorize('HR_ADMIN', 'SUPER_ADMIN'), payrollController.emailPayslips);
router.post('/runs/:runId/approve', authorize('SUPER_ADMIN'), payrollController.approvePayroll);
router.post('/runs/:runId/mark-paid', authorize('SUPER_ADMIN'), payrollController.markPaid);
router.get('/export', authorize('HR_ADMIN', 'SUPER_ADMIN'), payrollController.exportRegister);

export default router;
