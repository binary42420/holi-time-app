import { UserRole, User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker';
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data in correct order (respecting foreign keys)
  console.log('🧹 Clearing existing data...');

  await prisma.timeEntry.deleteMany({});
  console.log('  ✅ Cleared time entries');

  await prisma.assignedPersonnel.deleteMany({});
  console.log('  ✅ Cleared assigned personnel');

  await prisma.timesheet.deleteMany({});
  console.log('  ✅ Cleared timesheets');

  await prisma.shift.deleteMany({});
  console.log('  ✅ Cleared shifts');

  await prisma.job.deleteMany({});
  console.log('  ✅ Cleared jobs');

  // Only delete non-admin users to preserve login accounts
  await prisma.user.deleteMany({
    where: {
      email: {
        notIn: ['admin@example.com', 'ryley92@gmail.com', 'crewchief@example.com']
      }
    }
  });
  console.log('  ✅ Cleared non-admin users');

  await prisma.company.deleteMany({});
  console.log('  ✅ Cleared companies');

  console.log('🎯 Data cleared successfully!');

  console.log('👥 Creating placeholder users...');
  // Create placeholder users for unassigned slots
  const roleCodes = ['CC', 'SH', 'FO', 'RFO', 'RG', 'GL'];
  for (const roleCode of roleCodes) {
    const placeholderName = `Placeholder ${roleCode}`;
    await prisma.user.upsert({
      where: { email: `${roleCode.toLowerCase()}-placeholder@example.com` },
      update: {},
      create: {
        name: placeholderName,
        email: `${roleCode.toLowerCase()}-placeholder@example.com`,
        passwordHash: 'placeholder',
        role: 'Employee',
        isActive: false,
      },
    });
  }
  console.log('  ✅ Created placeholder users');

  // --- Hash a common password ---
  const password = 'password123';
  const hashedPassword = await bcrypt.hash(password, 12);
  console.log(`Using common password: "${password}" , > ${hashedPassword}`);

  // --- Create Users for Each Role ---
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      name: 'Admin User',
      passwordHash: hashedPassword,
      role: UserRole.Admin,
    },
    create: {
      name: 'Admin User',
      email: 'admin@example.com',
      passwordHash: hashedPassword,
      role: UserRole.Admin,
    },
  });
  console.log('Created/Updated Admin User: admin@example.com');

  const managerUser = await prisma.user.upsert({
    where: { email: 'ryley92@gmail.com' },
    update: {
      name: 'ryley holmes',
      passwordHash: hashedPassword,
      role: UserRole.Admin,
    },
    create: {
      name: 'ryley holmes',
      email: 'ryley92@gmail.com',
      passwordHash: hashedPassword,
      role: UserRole.Admin,
    },
  });
  console.log('Created/Updated Manager User: manager@example.com');

  const crewChiefUser = await prisma.user.upsert({
    where: { email: 'crewchief@example.com' },
    update: {
      name: 'Crew Chief User',
      passwordHash: hashedPassword,
      role: UserRole.CrewChief,
    },
    create: {
      name: 'Crew Chief User',
      email: 'crewchief@example.com',
      passwordHash: hashedPassword,
      role: UserRole.CrewChief,
    },
  });
  console.log('Created/Updated Crew Chief User: crewchief@example.com');

  // --- Create Employees with Different Skills ---
  const employees: User[] = [];
  const crewChiefs: User[] = [];
  const stageHands: User[] = [];
  const forkOperators: User[] = [];
  const riggers: User[] = [];
  const gaffers: User[] = [];

  // Create Crew Chiefs (eligible employees)
  for (let i = 0; i < 5; i++) {
    const email = `crewchief${i + 1}@example.com`;
    const employee = await prisma.user.upsert({
      where: { email },
      update: {
        name: faker.person.fullName(),
        passwordHash: hashedPassword,
        role: UserRole.Employee,
        crew_chief_eligible: true,
      },
      create: {
        name: faker.person.fullName(),
        email,
        passwordHash: hashedPassword,
        role: UserRole.Employee,
        crew_chief_eligible: true,
      },
    });
    employees.push(employee);
    crewChiefs.push(employee);
    console.log(`Created/Updated Crew Chief Eligible: ${employee.email}`);
  }

  // Create Stage Hands
  for (let i = 0; i < 15; i++) {
    const email = `stagehand${i + 1}@example.com`;
    const employee = await prisma.user.upsert({
      where: { email },
      update: {
        name: faker.person.fullName(),
        passwordHash: hashedPassword,
        role: UserRole.Employee,
      },
      create: {
        name: faker.person.fullName(),
        email,
        passwordHash: hashedPassword,
        role: UserRole.Employee,
      },
    });
    employees.push(employee);
    stageHands.push(employee);
    console.log(`Created/Updated Stage Hand: ${employee.email}`);
  }

  // Create Fork Operators
  for (let i = 0; i < 8; i++) {
    const email = `forkop${i + 1}@example.com`;
    const employee = await prisma.user.upsert({
      where: { email },
      update: {
        name: faker.person.fullName(),
        passwordHash: hashedPassword,
        role: UserRole.Employee,
        fork_operator_eligible: true,
      },
      create: {
        name: faker.person.fullName(),
        email,
        passwordHash: hashedPassword,
        role: UserRole.Employee,
        fork_operator_eligible: true,
      },
    });
    employees.push(employee);
    forkOperators.push(employee);
    console.log(`Created/Updated Fork Operator: ${employee.email}`);
  }

  // Create Riggers
  for (let i = 0; i < 6; i++) {
    const email = `rigger${i + 1}@example.com`;
    const employee = await prisma.user.upsert({
      where: { email },
      update: {
        name: faker.person.fullName(),
        passwordHash: hashedPassword,
        role: UserRole.Employee,
      },
      create: {
        name: faker.person.fullName(),
        email,
        passwordHash: hashedPassword,
        role: UserRole.Employee,
      },
    });
    employees.push(employee);
    riggers.push(employee);
    console.log(`Created/Updated Rigger: ${employee.email}`);
  }

  // Create Gaffers/Lighting
  for (let i = 0; i < 4; i++) {
    const email = `gaffer${i + 1}@example.com`;
    const employee = await prisma.user.upsert({
      where: { email },
      update: {
        name: faker.person.fullName(),
        passwordHash: hashedPassword,
        role: UserRole.Employee,
      },
      create: {
        name: faker.person.fullName(),
        email,
        passwordHash: hashedPassword,
        role: UserRole.Employee,
      },
    });
    employees.push(employee);
    gaffers.push(employee);
    console.log(`Created/Updated Gaffer: ${employee.email}`);
  }

  // --- Create Companies, Jobs, Shifts, and Realistic Assignments ---
  const shiftTemplates = [
    { name: 'Small Load-In', cc: 1, sh: 3, fo: 0, rg: 0, gl: 0 },
    { name: 'Medium Load-In', cc: 1, sh: 5, fo: 1, rg: 0, gl: 0 },
    { name: 'Large Load-In', cc: 1, sh: 8, fo: 2, rg: 1, gl: 1 },
    { name: 'Concert Setup', cc: 1, sh: 6, fo: 1, rg: 2, gl: 2 },
    { name: 'Corporate Event', cc: 1, sh: 4, fo: 0, rg: 1, gl: 1 },
    { name: 'Festival Setup', cc: 1, sh: 10, fo: 3, rg: 2, gl: 2 },
    { name: 'Theater Load-In', cc: 1, sh: 4, fo: 1, rg: 1, gl: 1 },
    { name: 'Warehouse Move', cc: 1, sh: 6, fo: 2, rg: 0, gl: 0 },
  ];

  // Define specific companies and their job types
  const companyData = [
    {
      name: 'Maktive',
      jobs: [
        'Taylor Swift Eras Tour - Load In',
        'Coachella Main Stage Setup',
        'Madison Square Garden Concert',
        'Red Rocks Amphitheater Show'
      ]
    },
    {
      name: 'Show Imaging',
      jobs: [
        'LED Wall Installation - Arena Tour',
        'Video Production Setup',
        'Corporate AV Installation',
        'Broadcast Equipment Setup'
      ]
    },
    {
      name: 'C&S Construction',
      jobs: [
        'Stage Construction - Music Festival',
        'Venue Renovation Project',
        'Temporary Structure Build',
        'Backstage Area Construction'
      ]
    },
    {
      name: 'Frontwave',
      jobs: [
        'Sound System Installation',
        'Audio Engineering Setup',
        'Concert Hall Acoustics',
        'Festival Sound Booth Setup'
      ]
    }
  ];

  for (const companyInfo of companyData) {
    const company = await prisma.company.create({
      data: {
        name: companyInfo.name,
        address: faker.location.streetAddress(),
        phone: faker.phone.number(),
        email: faker.internet.email(),
      },
    });
    console.log(`Created company: ${company.name}`);

    await prisma.user.create({
        data: {
          name: faker.person.fullName(),
          email: faker.internet.email(),
          passwordHash: hashedPassword,
          role: UserRole.CompanyUser,
          companyId: company.id,
        },
      });

    for (const jobName of companyInfo.jobs) {
      const job = await prisma.job.create({
        data: {
          name: jobName,
          description: `Professional ${jobName.toLowerCase()} requiring skilled stage crew and technical personnel`,
          status: faker.helpers.arrayElement(['Active', 'Pending', 'Completed']),
          companyId: company.id,
        },
      });
      console.log(`Created job: ${job.name}`);

      // Create shifts with different dates (past, today, future)
      const dates = [
        faker.date.past(), // Past shift
        new Date(), // Today's shift
        faker.date.soon(1), // Tomorrow
        faker.date.future(7), // Future shift
      ];

      for (let k = 0; k < dates.length; k++) {
        const template = faker.helpers.arrayElement(shiftTemplates);
        const shiftDate = dates[k];
        const startTime = new Date(shiftDate);
        startTime.setHours(faker.number.int({ min: 6, max: 10 }), 0, 0, 0);

        const endTime = new Date(startTime);
        endTime.setHours(startTime.getHours() + faker.number.int({ min: 6, max: 12 }));

        const totalWorkers = template.cc + template.sh + template.fo + template.rg + template.gl;

        const shift = await prisma.shift.create({
          data: {
            date: shiftDate,
            startTime: startTime,
            endTime: endTime,
            jobId: job.id,
            requestedWorkers: totalWorkers,
            requiredStagehands: template.sh,
            status: shiftDate < new Date() ? 'Completed' : 'Pending',
          },
        });
        console.log(`Created ${template.name} shift for job: ${job.name} on ${shiftDate.toDateString()}`);
        console.log(`  📋 Requirements: CC:${template.cc}, SH:${template.sh}, FO:${template.fo}, RG:${template.rg}, GL:${template.gl}`);

        // Assign workers with proper role codes
        let assignmentCount = 0;

        // Always assign exactly 1 crew chief (required)
        if (template.cc > 0 && crewChiefs.length > 0) {
          const crewChief = faker.helpers.arrayElement(crewChiefs);
          await prisma.assignedPersonnel.create({
            data: {
              shiftId: shift.id,
              userId: crewChief.id,
              roleCode: 'CC',
              status: 'Assigned',
            },
          });
          assignmentCount++;
          console.log(`  → Assigned Crew Chief: ${crewChief.name}`);
        }

        // Assign stage hands
        for (let sh = 0; sh < template.sh && stageHands.length > 0; sh++) {
          const stageHand = faker.helpers.arrayElement(stageHands);
          await prisma.assignedPersonnel.create({
            data: {
              shiftId: shift.id,
              userId: stageHand.id,
              roleCode: 'SH',
              status: 'Assigned',
            },
          });
          assignmentCount++;
          console.log(`  → Assigned Stage Hand: ${stageHand.name}`);
        }

        // Assign fork operators
        for (let fo = 0; fo < template.fo && forkOperators.length > 0; fo++) {
          const forkOp = faker.helpers.arrayElement(forkOperators);
          await prisma.assignedPersonnel.create({
            data: {
              shiftId: shift.id,
              userId: forkOp.id,
              roleCode: 'FO',
              status: 'Assigned',
            },
          });
          assignmentCount++;
          console.log(`  → Assigned Fork Operator: ${forkOp.name}`);
        }

        // Assign riggers
        for (let rg = 0; rg < template.rg && riggers.length > 0; rg++) {
          const rigger = faker.helpers.arrayElement(riggers);
          await prisma.assignedPersonnel.create({
            data: {
              shiftId: shift.id,
              userId: rigger.id,
              roleCode: 'RG',
              status: 'Assigned',
            },
          });
          assignmentCount++;
          console.log(`  → Assigned Rigger: ${rigger.name}`);
        }

        // Assign gaffers/lighting
        for (let gl = 0; gl < template.gl && gaffers.length > 0; gl++) {
          const gaffer = faker.helpers.arrayElement(gaffers);
          await prisma.assignedPersonnel.create({
            data: {
              shiftId: shift.id,
              userId: gaffer.id,
              roleCode: 'GL',
              status: 'Assigned',
            },
          });
          assignmentCount++;
          console.log(`  → Assigned Gaffer/Lighting: ${gaffer.name}`);
        }

        console.log(`  ✅ Total assignments: ${assignmentCount}/${totalWorkers}`);
      }
    }
  }

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
