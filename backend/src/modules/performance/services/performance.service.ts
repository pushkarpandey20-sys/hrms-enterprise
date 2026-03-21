import { prisma } from '../../../config/database';
import ApiError from '../../../shared/utils/ApiError';
import {
  CycleType, CycleStatus, GoalStatus, GoalType, GoalCategory,
  ReviewType, ReviewStatus, FeedbackRelation, PIPStatus
} from '@prisma/client';

// ─── Review Cycles ────────────────────────────────────────────────────────────

export const createCycle = async (orgId: string, data: {
  title: string; type: CycleType;
  startDate: Date; endDate: Date;
  selfReviewDeadline?: Date; managerReviewDeadline?: Date; peersDeadline?: Date;
}) => {
  return prisma.reviewCycle.create({
    data: { ...data, organizationId: orgId },
  });
};

export const listCycles = async (orgId: string) => {
  return prisma.reviewCycle.findMany({
    where: { organizationId: orgId },
    include: {
      _count: { select: { goals: true, reviews: true } },
    },
    orderBy: { startDate: 'desc' },
  });
};

export const updateCycleStatus = async (cycleId: string, orgId: string, status: CycleStatus) => {
  const cycle = await prisma.reviewCycle.findFirst({ where: { id: cycleId, organizationId: orgId } });
  if (!cycle) throw ApiError.notFound('Review cycle not found');
  return prisma.reviewCycle.update({ where: { id: cycleId }, data: { status } });
};

// ─── Goals ────────────────────────────────────────────────────────────────────

export const createGoal = async (data: {
  cycleId: string; employeeId: string; orgId: string;
  title: string; description?: string;
  type: GoalType; category: GoalCategory;
  targetValue?: number; weightage?: number;
  dueDate?: Date; kpiMetric?: string;
}) => {
  // Verify cycle belongs to org
  const cycle = await prisma.reviewCycle.findFirst({
    where: { id: data.cycleId, organizationId: data.orgId },
  });
  if (!cycle) throw ApiError.notFound('Review cycle not found');

  return prisma.goal.create({
    data: {
      cycleId: data.cycleId,
      employeeId: data.employeeId,
      title: data.title,
      description: data.description,
      type: data.type,
      category: data.category,
      targetValue: data.targetValue,
      currentValue: 0,
      weightage: data.weightage ?? 1,
      dueDate: data.dueDate,
      kpiMetric: data.kpiMetric,
    },
  });
};

export const updateGoalProgress = async (
  goalId: string, employeeId: string,
  currentValue: number, comment?: string,
) => {
  const goal = await prisma.goal.findFirst({ where: { id: goalId, employeeId } });
  if (!goal) throw ApiError.notFound('Goal not found');

  const progress = goal.targetValue ? Math.min(100, (currentValue / goal.targetValue) * 100) : 0;
  const status = progress >= 100 ? GoalStatus.COMPLETED : GoalStatus.IN_PROGRESS;

  return prisma.goal.update({
    where: { id: goalId },
    data: {
      currentValue,
      progress,
      status,
      updates: {
        create: { currentValue, comment, updatedById: employeeId },
      },
    },
    include: { updates: { orderBy: { createdAt: 'desc' }, take: 5 } },
  });
};

export const getEmployeeGoals = async (employeeId: string, cycleId?: string) => {
  return prisma.goal.findMany({
    where: {
      employeeId,
      ...(cycleId ? { cycleId } : {}),
    },
    include: {
      cycle: { select: { title: true, type: true } },
      updates: { orderBy: { createdAt: 'desc' }, take: 3 },
    },
    orderBy: { createdAt: 'desc' },
  });
};

// ─── Performance Reviews ──────────────────────────────────────────────────────

export const initiateReview = async (cycleId: string, orgId: string, data: {
  revieweeId: string; reviewerId: string; reviewType: ReviewType;
}) => {
  const cycle = await prisma.reviewCycle.findFirst({
    where: { id: cycleId, organizationId: orgId },
  });
  if (!cycle) throw ApiError.notFound('Review cycle not found');

  return prisma.performanceReview.create({
    data: {
      cycleId,
      revieweeId: data.revieweeId,
      reviewerId: data.reviewerId,
      reviewType: data.reviewType,
    },
    include: {
      reviewee: { select: { firstName: true, lastName: true } },
      reviewer: { select: { firstName: true, lastName: true } },
    },
  });
};

export const submitReview = async (reviewId: string, reviewerId: string, data: {
  overallRating: number;
  strengthsText?: string;
  improvementsText?: string;
  goalAchievementScore?: number;
  competencyScores?: Record<string, number>;
  recommendations?: string;
}) => {
  const review = await prisma.performanceReview.findFirst({
    where: { id: reviewId, reviewerId },
  });
  if (!review) throw ApiError.notFound('Review not found or not assigned to you');
  if (review.status !== ReviewStatus.PENDING && review.status !== ReviewStatus.IN_PROGRESS) {
    throw ApiError.badRequest('Review is already submitted');
  }

  return prisma.performanceReview.update({
    where: { id: reviewId },
    data: {
      ...data,
      status: ReviewStatus.SUBMITTED,
      submittedAt: new Date(),
    },
  });
};

export const getCycleReviews = async (cycleId: string, orgId: string) => {
  const cycle = await prisma.reviewCycle.findFirst({ where: { id: cycleId, organizationId: orgId } });
  if (!cycle) throw ApiError.notFound('Cycle not found');

  return prisma.performanceReview.findMany({
    where: { cycleId },
    include: {
      reviewee: { select: { firstName: true, lastName: true, department: { select: { name: true } } } },
      reviewer: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

// ─── 360° Feedback ────────────────────────────────────────────────────────────

export const requestFeedback = async (data: {
  cycleId: string; subjectId: string; providerId: string;
  relation: FeedbackRelation; requestedById: string;
}) => {
  return prisma.feedback360.create({
    data: {
      cycleId: data.cycleId,
      subjectId: data.subjectId,
      providerId: data.providerId,
      relation: data.relation,
      requestedById: data.requestedById,
    },
  });
};

export const submitFeedback = async (feedbackId: string, providerId: string, data: {
  overallRating: number;
  strengthsText?: string;
  improvementsText?: string;
  collaborationRating?: number;
  communicationRating?: number;
  leadershipRating?: number;
  technicalRating?: number;
  isAnonymous?: boolean;
}) => {
  const fb = await prisma.feedback360.findFirst({ where: { id: feedbackId, providerId } });
  if (!fb) throw ApiError.notFound('Feedback request not found');

  return prisma.feedback360.update({
    where: { id: feedbackId },
    data: { ...data, isSubmitted: true, submittedAt: new Date() },
  });
};

export const getEmployeeFeedback = async (subjectId: string, cycleId?: string) => {
  return prisma.feedback360.findMany({
    where: {
      subjectId,
      isSubmitted: true,
      ...(cycleId ? { cycleId } : {}),
    },
    include: {
      provider: {
        select: {
          firstName: true, lastName: true,
          designation: { select: { title: true } },
        },
      },
    },
  });
};

// ─── PIP Plans ────────────────────────────────────────────────────────────────

export const createPIP = async (orgId: string, data: {
  employeeId: string; managerId: string;
  reason: string; startDate: Date; endDate: Date;
  objectives: string; expectedOutcomes: string;
  reviewFrequency: string;
}) => {
  return prisma.pIPPlan.create({
    data: {
      ...data,
      organizationId: orgId,
      status: PIPStatus.ACTIVE,
    },
    include: {
      employee: { select: { firstName: true, lastName: true, department: { select: { name: true } } } },
      manager: { select: { firstName: true, lastName: true } },
    },
  });
};

export const addPIPCheckIn = async (pipId: string, managerId: string, data: {
  notes: string; performanceRating: number;
  attendeeIds?: string[];
}) => {
  const pip = await prisma.pIPPlan.findFirst({ where: { id: pipId, managerId } });
  if (!pip) throw ApiError.notFound('PIP not found');

  return prisma.pIPCheckIn.create({
    data: {
      pipId,
      notes: data.notes,
      performanceRating: data.performanceRating,
      conductedById: managerId,
      attendeeIds: data.attendeeIds ?? [],
    },
  });
};

export const closePIP = async (pipId: string, managerId: string, data: {
  status: PIPStatus.COMPLETED | PIPStatus.EXTENDED | PIPStatus.TERMINATED;
  outcome: string; bonusRecommendation?: number;
}) => {
  const pip = await prisma.pIPPlan.findFirst({ where: { id: pipId, managerId } });
  if (!pip) throw ApiError.notFound('PIP not found');

  return prisma.pIPPlan.update({
    where: { id: pipId },
    data: {
      status: data.status,
      outcome: data.outcome,
      bonusRecommendation: data.bonusRecommendation,
      closedAt: new Date(),
    },
  });
};

export const getEmployeePIPs = async (employeeId: string, orgId: string) => {
  return prisma.pIPPlan.findMany({
    where: { employeeId, organizationId: orgId },
    include: {
      manager: { select: { firstName: true, lastName: true } },
      checkIns: { orderBy: { createdAt: 'desc' } },
    },
    orderBy: { startDate: 'desc' },
  });
};

// ─── Rating-linked Bonus Calculation ─────────────────────────────────────────

export const calculateBonus = async (orgId: string, cycleId: string) => {
  const reviews = await prisma.performanceReview.findMany({
    where: {
      cycleId,
      reviewType: ReviewType.MANAGER,
      status: ReviewStatus.SUBMITTED,
      cycle: { organizationId: orgId },
    },
    include: {
      reviewee: {
        include: {
          payrollRecords: {
            orderBy: { periodEnd: 'desc' },
            take: 1,
            select: { grossSalary: true },
          },
        },
      },
    },
  });

  const bonusMatrix: Record<number, number> = {
    5: 0.20, // 20% bonus
    4: 0.15,
    3: 0.10,
    2: 0.05,
    1: 0,
  };

  return reviews.map(r => {
    const rating = Math.round(r.overallRating ?? 0);
    const bonusPct = bonusMatrix[rating] ?? 0;
    const lastGross = r.reviewee.payrollRecords[0]?.grossSalary ?? 0;
    return {
      employeeId: r.revieweeId,
      name: `${r.reviewee.firstName} ${r.reviewee.lastName}`,
      rating: r.overallRating,
      bonusPercentage: bonusPct * 100,
      bonusAmount: Number(lastGross) * bonusPct,
    };
  });
};
