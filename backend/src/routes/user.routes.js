import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { requireAuth, requireSupervisor, requireSuperAdmin } from '../middleware/auth.middleware.js';
import { basePrisma, attachScopedPrisma } from '../middleware/tenant.middleware.js';

const router = Router();
router.use(requireAuth, attachScopedPrisma);

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8).optional(),
  roles: z.array(z.string()).default(['employee']),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  roles: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

router.get('/', requireSupervisor, async (req, res, next) => {
  try {
    const users = await req.prisma.user.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true, email: true, name: true, roles: true,
        isActive: true, createdAt: true, tenantId: true,
      },
    });
    res.json(users);
  } catch (err) { next(err); }
});

router.post('/', requireSupervisor, async (req, res, next) => {
  try {
    const { password, ...data } = createSchema.parse(req.body);
    const user = await basePrisma.user.create({
      data: {
        ...data,
        tenantId: req.user.tenantId,
        hashedPassword: password ? await bcrypt.hash(password, 10) : null,
      },
      select: { id: true, email: true, name: true, roles: true, isActive: true },
    });
    res.status(201).json(user);
  } catch (err) { next(err); }
});

router.patch('/:id', requireSupervisor, async (req, res, next) => {
  try {
    const { password, ...data } = updateSchema.parse(req.body);
    const updateData = { ...data };
    if (password) updateData.hashedPassword = await bcrypt.hash(password, 10);

    const user = await basePrisma.user.update({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId },
      data: updateData,
      select: { id: true, email: true, name: true, roles: true, isActive: true },
    });
    res.json(user);
  } catch (err) { next(err); }
});

router.delete('/:id', requireSupervisor, async (req, res, next) => {
  try {
    await basePrisma.user.update({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId },
      data: { isActive: false },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// Super admin: search all users across tenants
router.get('/all', requireSuperAdmin, async (req, res, next) => {
  try {
    const { q } = req.query;
    const users = await basePrisma.user.findMany({
      where: q ? {
        OR: [
          { email: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      } : undefined,
      include: { tenant: { select: { name: true, slug: true } } },
      orderBy: { name: 'asc' },
      take: 100,
    });
    res.json(users);
  } catch (err) { next(err); }
});

export default router;
