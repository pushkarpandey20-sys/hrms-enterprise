import Bull from 'bull';
import { payrollService } from '../modules/payroll/services/payroll.service';
import { logger } from '../shared/utils/logger';

export const payrollQueue = new Bull('payroll', {
  redis: process.env.REDIS_URL || 'redis://localhost:6379',
});

payrollQueue.process('run-payroll', async (job) => {
  const { orgId, month, year, employeeIds } = job.data;
  logger.info(`Processing payroll job: ${orgId} - ${month}/${year}`);
  return payrollService.runPayroll(orgId, month, year, employeeIds);
});

payrollQueue.on('completed', (job) => logger.info(`Payroll job completed: ${job.id}`));
payrollQueue.on('failed', (job, err) => logger.error(`Payroll job failed: ${job.id}`, err));

export async function schedulePayrollRun(orgId: string, month: number, year: number, employeeIds?: string[]) {
  return payrollQueue.add('run-payroll', { orgId, month, year, employeeIds }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  });
}
