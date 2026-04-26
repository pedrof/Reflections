import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireComms } from '../middleware/auth.middleware.js';
import { attachScopedPrisma, basePrisma } from '../middleware/tenant.middleware.js';
import { generateWARNarrative } from '../services/ai.service.js';

const router = Router();
router.use(requireAuth, attachScopedPrisma);

const dateRangeSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
});

router.post('/war/preview', async (req, res, next) => {
  try {
    const { startDate, endDate, accomplishmentIds } = z.object({
      ...dateRangeSchema.shape,
      accomplishmentIds: z.array(z.number()).optional(),
    }).parse(req.body);

    const where = {
      tenantId: req.user.tenantId,
      userId: req.user.userId,
      dateOfAccomplishment: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
      ...(accomplishmentIds?.length && { id: { in: accomplishmentIds } }),
    };

    const accomplishments = await basePrisma.accomplishment.findMany({
      where,
      include: {
        objectives: { include: { objective: true } },
        elements: { include: { element: true } },
      },
      orderBy: { dateOfAccomplishment: 'asc' },
    });

    const user = await basePrisma.user.findUnique({
      where: { id: req.user.userId },
      select: { name: true },
    });

    const narrative = accomplishments.length
      ? await generateWARNarrative(accomplishments, user.name, startDate, endDate)
      : '';

    const objectivesCovered = [
      ...new Map(
        accomplishments
          .flatMap((a) => a.objectives.map((ao) => ao.objective))
          .map((o) => [o.id, o])
      ).values(),
    ];

    const elementsCovered = [
      ...new Map(
        accomplishments
          .flatMap((a) => a.elements.map((ae) => ae.element))
          .map((e) => [e.id, e])
      ).values(),
    ];

    res.json({
      employee: user,
      startDate,
      endDate,
      narrative,
      accomplishments,
      objectivesCovered,
      elementsCovered,
    });
  } catch (err) { next(err); }
});

router.post('/comms/preview', requireComms, async (req, res, next) => {
  try {
    const { startDate, endDate } = dateRangeSchema.parse(req.body);

    const accomplishments = await basePrisma.accomplishment.findMany({
      where: {
        tenantId: req.user.tenantId,
        flaggedForComms: true,
        dateOfAccomplishment: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        objectives: { include: { objective: true } },
        elements: { include: { element: true } },
      },
      orderBy: [{ user: { name: 'asc' } }, { dateOfAccomplishment: 'asc' }],
    });

    // Group by employee
    const grouped = accomplishments.reduce((acc, item) => {
      const key = item.userId;
      if (!acc[key]) acc[key] = { user: item.user, accomplishments: [] };
      acc[key].accomplishments.push(item);
      return acc;
    }, {});

    const tenant = await basePrisma.tenant.findUnique({
      where: { id: req.user.tenantId },
      select: { name: true },
    });

    res.json({
      tenant,
      startDate,
      endDate,
      groups: Object.values(grouped),
      total: accomplishments.length,
    });
  } catch (err) { next(err); }
});

export default router;
