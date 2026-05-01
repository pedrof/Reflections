import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireSupervisor, requireComms } from '../middleware/auth.middleware.js';
import { attachScopedPrisma, basePrisma } from '../middleware/tenant.middleware.js';
import { rewriteAsSTAR, recommendLinks, generateClarifyingQuestions } from '../services/ai.service.js';
import { getFiscalYearAndPeriod } from '../utils/fiscalYear.js';

const router = Router();
router.use(requireAuth, attachScopedPrisma);

const createSchema = z.object({
  rawText: z.string().min(1),
  dateOfAccomplishment: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  tags: z.array(z.string()).default([]),
  flaggedForComms: z.boolean().default(false),
  commsNote: z.string().optional(),
});

const updateSchema = z.object({
  editedStarText: z.string().optional(),
  tags: z.array(z.string()).optional(),
  flaggedForComms: z.boolean().optional(),
  commsNote: z.string().optional().nullable(),
  rawText: z.string().optional(),
  dateOfAccomplishment: z.string().optional(),
});

const includeRelations = {
  objectives: { include: { objective: true } },
  elements: { include: { element: true } },
  user: { select: { id: true, name: true, email: true } },
};

// Team view — supervisor only
router.get('/team', requireSupervisor, async (req, res, next) => {
  try {
    const { fiscalYear, period, userId } = req.query;
    const where = {
      tenantId: req.user.tenantId,
      ...(fiscalYear && { fiscalYear: Number(fiscalYear) }),
      ...(period && { period }),
      ...(userId && { userId: Number(userId) }),
    };
    const accomplishments = await basePrisma.accomplishment.findMany({
      where,
      include: includeRelations,
      orderBy: { dateOfAccomplishment: 'desc' },
    });
    res.json(accomplishments);
  } catch (err) { next(err); }
});

// Comms view
router.get('/comms', requireComms, async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const where = {
      tenantId: req.user.tenantId,
      flaggedForComms: true,
      ...(startDate && endDate && {
        dateOfAccomplishment: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      }),
    };
    const accomplishments = await basePrisma.accomplishment.findMany({
      where,
      include: includeRelations,
      orderBy: { dateOfAccomplishment: 'desc' },
    });
    res.json(accomplishments);
  } catch (err) { next(err); }
});

// Employee list
router.get('/', async (req, res, next) => {
  try {
    const { tag, fiscalYear, period, flaggedForComms } = req.query;
    const where = {
      userId: req.user.userId,
      ...(fiscalYear && { fiscalYear: Number(fiscalYear) }),
      ...(period && { period }),
      ...(flaggedForComms !== undefined && { flaggedForComms: flaggedForComms === 'true' }),
      ...(tag && { tags: { has: tag } }),
    };
    const accomplishments = await req.prisma.accomplishment.findMany({
      where,
      include: includeRelations,
      orderBy: { dateOfAccomplishment: 'desc' },
    });
    res.json(accomplishments);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const { fiscalYear, period } = getFiscalYearAndPeriod(data.dateOfAccomplishment);
    const accomplishment = await basePrisma.accomplishment.create({
      data: {
        ...data,
        dateOfAccomplishment: new Date(data.dateOfAccomplishment),
        fiscalYear,
        period,
        tenantId: req.user.tenantId,
        userId: req.user.userId,
      },
      include: includeRelations,
    });
    res.status(201).json(accomplishment);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const acc = await basePrisma.accomplishment.findFirst({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId },
      include: includeRelations,
    });
    if (!acc) return res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
    res.json(acc);
  } catch (err) { next(err); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const data = updateSchema.parse(req.body);
    const updateData = { ...data };
    if (data.dateOfAccomplishment) {
      const { fiscalYear, period } = getFiscalYearAndPeriod(data.dateOfAccomplishment);
      updateData.dateOfAccomplishment = new Date(data.dateOfAccomplishment);
      updateData.fiscalYear = fiscalYear;
      updateData.period = period;
    }
    const acc = await basePrisma.accomplishment.update({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId, userId: req.user.userId },
      data: updateData,
      include: includeRelations,
    });
    res.json(acc);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await basePrisma.accomplishment.delete({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId, userId: req.user.userId },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.post('/:id/clarify', async (req, res, next) => {
  try {
    const acc = await basePrisma.accomplishment.findFirst({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId, userId: req.user.userId },
    });
    if (!acc) return res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
    const result = await generateClarifyingQuestions(acc.rawText);
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/:id/rewrite', async (req, res, next) => {
  try {
    const acc = await basePrisma.accomplishment.findFirst({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId, userId: req.user.userId },
    });
    if (!acc) return res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });

    const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
    const starText = await rewriteAsSTAR(acc.rawText, answers);
    const updated = await basePrisma.accomplishment.update({
      where: { id: acc.id },
      data: { starText },
      include: includeRelations,
    });
    res.json(updated);
  } catch (err) { next(err); }
});

router.post('/:id/recommend', async (req, res, next) => {
  try {
    const acc = await basePrisma.accomplishment.findFirst({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId, userId: req.user.userId },
    });
    if (!acc) return res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
    if (!acc.starText) {
      return res.status(400).json({ error: 'Run STAR rewrite first', code: 'NO_STAR_TEXT' });
    }

    const objectives = await basePrisma.objective.findMany({
      where: { tenantId: req.user.tenantId, userId: req.user.userId },
    });
    const elements = await basePrisma.element.findMany({
      where: { tenantId: req.user.tenantId, userId: req.user.userId },
    });

    const aiRecommendations = await recommendLinks(acc.starText, objectives, elements);
    const updated = await basePrisma.accomplishment.update({
      where: { id: acc.id },
      data: { aiRecommendations },
      include: includeRelations,
    });
    res.json(updated);
  } catch (err) { next(err); }
});

router.post('/:id/link', async (req, res, next) => {
  try {
    const { objectiveIds, elementIds } = z.object({
      objectiveIds: z.array(z.number()).default([]),
      elementIds: z.array(z.number()).default([]),
    }).parse(req.body);

    const acc = await basePrisma.accomplishment.findFirst({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId, userId: req.user.userId },
    });
    if (!acc) return res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });

    // Replace links
    await basePrisma.accomplishmentObjective.deleteMany({ where: { accomplishmentId: acc.id } });
    await basePrisma.accomplishmentElement.deleteMany({ where: { accomplishmentId: acc.id } });

    const updated = await basePrisma.accomplishment.update({
      where: { id: acc.id },
      data: {
        objectives: { create: objectiveIds.map((id) => ({ objectiveId: id })) },
        elements: { create: elementIds.map((id) => ({ elementId: id })) },
      },
      include: includeRelations,
    });
    res.json(updated);
  } catch (err) { next(err); }
});

export default router;
