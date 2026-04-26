import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireSuperAdmin } from '../middleware/auth.middleware.js';
import { basePrisma } from '../middleware/tenant.middleware.js';

const router = Router();
router.use(requireAuth, requireSuperAdmin);

const tenantSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
});

router.get('/', async (req, res, next) => {
  try {
    const tenants = await basePrisma.tenant.findMany({
      include: { _count: { select: { users: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(tenants);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const data = tenantSchema.parse(req.body);
    const tenant = await basePrisma.tenant.create({ data });
    res.status(201).json(tenant);
  } catch (err) { next(err); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const data = tenantSchema.partial().parse(req.body);
    const tenant = await basePrisma.tenant.update({
      where: { id: Number(req.params.id) },
      data,
    });
    res.json(tenant);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await basePrisma.tenant.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
