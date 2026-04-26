import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({ errorFormat: 'minimal' });

const hash = (pw) => bcrypt.hashSync(pw, 10);

const STAR_SAMPLE = `**Situation:** Our team faced increasing manual reporting overhead as project deliverables grew in scope and complexity during the fiscal quarter.

**Task:** Responsible for designing and implementing an automated reporting pipeline to reduce weekly report generation time by at least 50%.

**Action:** Analyzed existing reporting workflows, identified redundant data extraction steps, and developed a Python-based automation script integrated with our project management API. Coordinated with three stakeholders to validate requirements and conducted two rounds of user acceptance testing.

**Result:** Deployed solution that reduced report generation time from 4 hours to 18 minutes per cycle, saving approximately 14 staff-hours weekly and eliminating two categories of reporting errors previously flagged in audits.`;

async function main() {
  console.log('Seeding database...');

  // Super-admin tenant
  const systemTenant = await prisma.tenant.upsert({
    where: { slug: 'system' },
    update: {},
    create: { name: 'System', slug: 'system' },
  });

  // Super admin user
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: systemTenant.id, email: 'admin@reflections.local' } },
    update: {},
    create: {
      tenantId: systemTenant.id,
      email: 'admin@reflections.local',
      name: 'System Administrator',
      hashedPassword: hash('ChangeMe123!'),
      roles: ['super_admin'],
    },
  });

  // Create two tenants and populate each
  for (const org of ['alpha', 'bravo']) {
    const tenant = await prisma.tenant.upsert({
      where: { slug: `team-${org}` },
      update: {},
      create: { name: `Team ${org.charAt(0).toUpperCase() + org.slice(1)}`, slug: `team-${org}` },
    });

    // Supervisor
    const supervisor = await prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: `sup@${org}.local` } },
      update: {},
      create: {
        tenantId: tenant.id,
        email: `sup@${org}.local`,
        name: `${org.charAt(0).toUpperCase() + org.slice(1)} Supervisor`,
        hashedPassword: hash('Password123!'),
        roles: ['supervisor'],
      },
    });

    // Comms user
    await prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: `comms@${org}.local` } },
      update: {},
      create: {
        tenantId: tenant.id,
        email: `comms@${org}.local`,
        name: `${org.charAt(0).toUpperCase() + org.slice(1)} Communications`,
        hashedPassword: hash('Password123!'),
        roles: ['comms'],
      },
    });

    // 3 employees per org
    for (let i = 1; i <= 3; i++) {
      const emp = await prisma.user.upsert({
        where: { tenantId_email: { tenantId: tenant.id, email: `emp${i}@${org}.local` } },
        update: {},
        create: {
          tenantId: tenant.id,
          email: `emp${i}@${org}.local`,
          name: `Employee ${i} (${org.charAt(0).toUpperCase() + org.slice(1)})`,
          hashedPassword: hash('Password123!'),
          roles: ['employee'],
        },
      });

      // 2 objectives per employee
      const obj1 = await prisma.objective.create({
        data: {
          tenantId: tenant.id,
          userId: emp.id,
          title: 'Mission Readiness & Operational Excellence',
          description:
            'Maintain and improve operational readiness by identifying inefficiencies, streamlining processes, and ensuring all deliverables meet or exceed established quality standards within prescribed timelines.',
          sortOrder: 0,
        },
      });

      const obj2 = await prisma.objective.create({
        data: {
          tenantId: tenant.id,
          userId: emp.id,
          title: 'Stakeholder Engagement & Communication',
          description:
            'Build and sustain productive relationships with internal and external stakeholders through clear, timely, and professional communication that advances organizational goals and fosters trust.',
          sortOrder: 1,
        },
      });

      // 2 elements per employee
      const el1 = await prisma.element.create({
        data: {
          tenantId: tenant.id,
          userId: emp.id,
          title: 'Technical Proficiency',
          description:
            'Demonstrates mastery of required technical skills and tools. Applies technical knowledge effectively to solve problems, improve processes, and deliver high-quality work products independently.',
          sortOrder: 0,
        },
      });

      const el2 = await prisma.element.create({
        data: {
          tenantId: tenant.id,
          userId: emp.id,
          title: 'Collaboration & Teamwork',
          description:
            'Actively contributes to team success by sharing knowledge, supporting colleagues, and fostering a cooperative work environment that advances shared objectives.',
          sortOrder: 1,
        },
      });

      // 3 accomplishments per employee
      const accomplishmentData = [
        {
          rawText: `Automated the weekly status report generation process that was previously done manually. Created a script that pulls data from multiple systems and generates a formatted report, saving the team significant time each week.`,
          tags: ['automation', 'reporting', 'efficiency'],
          dateOfAccomplishment: new Date('2025-11-15'),
          fiscalYear: 2026,
          period: 'Q1',
          flaggedForComms: true,
          commsNote: 'Good example of innovation and efficiency for the newsletter.',
          objectiveIds: [obj1.id],
          elementIds: [el1.id],
        },
        {
          rawText: `Led a cross-functional working group with representatives from three divisions to develop new standard operating procedures for data handling. Facilitated four meetings and synthesized feedback into a final document that was approved by leadership.`,
          tags: ['leadership', 'sop', 'collaboration'],
          dateOfAccomplishment: new Date('2026-01-22'),
          fiscalYear: 2026,
          period: 'Q2',
          flaggedForComms: false,
          objectiveIds: [obj2.id],
          elementIds: [el2.id],
        },
        {
          rawText: `Identified a critical data validation gap in the intake process that was causing downstream errors in monthly reports. Developed a validation checklist and trained the team on its use, resulting in zero validation errors in the following two reporting cycles.`,
          tags: ['quality', 'training', 'data'],
          dateOfAccomplishment: new Date('2026-03-10'),
          fiscalYear: 2026,
          period: 'Q2',
          flaggedForComms: false,
          objectiveIds: [obj1.id],
          elementIds: [el1.id, el2.id],
        },
      ];

      for (const acc of accomplishmentData) {
        const { objectiveIds, elementIds, ...accData } = acc;
        await prisma.accomplishment.create({
          data: {
            ...accData,
            tenantId: tenant.id,
            userId: emp.id,
            starText: STAR_SAMPLE,
            objectives: {
              create: objectiveIds.map((id) => ({ objectiveId: id })),
            },
            elements: {
              create: elementIds.map((id) => ({ elementId: id })),
            },
          },
        });
      }
    }

    console.log(`  ✓ Tenant team-${org} seeded`);
  }

  console.log('\nSeed credentials:');
  console.log('  Super Admin : admin@reflections.local / ChangeMe123!  (tenant: system)');
  console.log('  Supervisor  : sup@alpha.local / Password123!           (tenant: team-alpha)');
  console.log('  Comms       : comms@alpha.local / Password123!         (tenant: team-alpha)');
  console.log('  Employee    : emp1@alpha.local / Password123!          (tenant: team-alpha)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
