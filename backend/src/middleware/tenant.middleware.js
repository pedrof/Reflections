import { PrismaClient } from '@prisma/client';

export const basePrisma = new PrismaClient({ errorFormat: 'minimal' });

export function createScopedClient(tenantId) {
  return basePrisma.$extends({
    query: {
      $allModels: {
        async findMany({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async findUnique({ args, query }) {
          // Prisma v5: findUnique with extended where requires findFirst
          const { where, ...rest } = args;
          return basePrisma.$extends({
            query: {
              $allModels: {
                async findFirst({ args: a, query: q }) {
                  a.where = { ...a.where, tenantId };
                  return q(a);
                },
              },
            },
          }).$queryRawUnsafe ? query(args) : query(args);
        },
        async create({ args, query }) {
          args.data = { ...args.data, tenantId };
          return query(args);
        },
        async update({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async delete({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async count({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
      },
    },
  });
}

export function attachScopedPrisma(req, res, next) {
  if (!req.user?.tenantId) return next();
  req.prisma = createScopedClient(req.user.tenantId);
  next();
}
