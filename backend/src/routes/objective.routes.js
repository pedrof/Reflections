import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.middleware.js';
import { attachScopedPrisma, basePrisma } from '../middleware/tenant.middleware.js';

const router = Router();
router.use(requireAuth, attachScopedPrisma);

const schema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  sortOrder: z.number().int().default(0),
  selfRating: z.number().int().min(1).max(5).nullable().optional(),
});

router.get('/', async (req, res, next) => {
  try {
    const objectives = await req.prisma.objective.findMany({
      where: { userId: req.user.userId },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(objectives);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const data = schema.parse(req.body);
    const objective = await basePrisma.objective.create({
      data: { ...data, tenantId: req.user.tenantId, userId: req.user.userId },
    });
    res.status(201).json(objective);
  } catch (err) { next(err); }
});

router.patch('/reorder', async (req, res, next) => {
  try {
    const items = z.array(z.object({ id: z.number(), sortOrder: z.number() })).parse(req.body);
    await Promise.all(
      items.map((item) =>
        basePrisma.objective.update({
          where: { id: item.id, tenantId: req.user.tenantId, userId: req.user.userId },
          data: { sortOrder: item.sortOrder },
        })
      )
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const data = schema.partial().parse(req.body);
    const objective = await basePrisma.objective.update({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId, userId: req.user.userId },
      data,
    });
    res.json(objective);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await basePrisma.objective.delete({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId, userId: req.user.userId },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
