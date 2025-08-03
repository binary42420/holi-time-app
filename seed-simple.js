const { prisma } = require('../src/lib/prisma');
const bcrypt = require('bcryptjs');

// Helper function to create emails from names
const createEmailFromName = (name) => {
  return name.toLowerCase().replace(/\s+/g, '.') + '@example.com';
};

// Helper function to parse complex time strings into Date objects
const parseTime = (date, timeStr) => {
  if (!timeStr) return null;
  const d = new Date(date);
  let [time, modifier] = timeStr.toLowerCase().split(/(am|pm)/);
  let [hours, minutes] = time.split(':').map(Number);

  minutes = minutes || 0;

  if (modifier === 'pm' && hours < 12) {
    hours += 12;
  }
  if (modifier === 'am' && hours === 12) {
    hours = 0;
  }
  
  d.setHours(hours, minutes, 0, 0);
  return d;
};

async function main() {
  console.log('🌱 Starting database seeding with real data...');

  // 1. Clear existing data
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
  await prisma.user.deleteMany({
    where: {
      email: {
        notIn: ['admin@example.com', 'ryley92@gmail.com'] 
      }
    }
  });
  console.log('  ✅ Cleared non-admin users');
  await prisma.company.deleteMany({});
  console.log('  ✅ Cleared companies');
  console.log('🎯 Data cleared successfully!');

  // 2. Setup reusable assets
  const password = 'password123';
  const hashedPassword = await bcrypt.hash(password, 12);
  console.log(`🔑 Using common password: "${password}"`);

  // 3. Create admin users
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@example.com',
      passwordHash: hashedPassword,
      role: 'Admin',
    },
  });
  console.log('👤 Created/Updated Admin User');

  // 4. Create Users (Employees) from provided data
  console.log('👥 Creating employees...');
  const employeeData = [
    { name: 'Ryley Holmes' }, { name: 'Lonzie belcher Sr' }, { name: 'Deshawn Wallace' },
    { name: 'Marjaan Flournoy' }, { name: 'Ed Shiloff' }, { name: 'Erik Santos' },
    { name: 'Raymont Duke' }, { name: 'Nikko Biteramos' }, { name: 'Jonas Charles' },
    { name: 'Eleazar Vargas' }, { name: 'Robert Cowan' }, { name: 'Ronald Burkett' },
    { name: 'Kendall Walker' }, { name: 'Lamont Pinkney' }, { name: 'Antione Belcher' },
    { name: 'Aldonna Figiel' }, { name: 'Michael Byrd' }, { name: 'Dan Martin' },
    { name: 'Kayley Palmeieri' }, { name: 'Ulyses DeAnda' }, { name: 'Laura Harvey' }
  ];

  const userMap = new Map();
  for (const emp of employeeData) {
    const user = await prisma.user.create({
      data: {
        name: emp.name,
        email: createEmailFromName(emp.name),
        passwordHash: hashedPassword,
        role: 'Employee',
      },
    });
    userMap.set(emp.name, user);
    console.log(`  ✅ Created Employee: ${user.name}`);
  }
  // Ensure Ryley has the correct admin role and email
   await prisma.user.upsert({
    where: { email: 'ryley92@gmail.com' },
    update: { name: 'Ryley Holmes', passwordHash: hashedPassword, role: 'Admin' },
    create: { name: 'Ryley Holmes', email: 'ryley92@gmail.com', passwordHash: hashedPassword, role: 'Admin' },
  });
   userMap.set('Ryley Holmes', await prisma.user.findUnique({where: {email: 'ryley92@gmail.com'}}));
   console.log('  ✅ Ensured Ryley Holmes is an Admin');


  // 5. Create Companies
  console.log('🏢 Creating companies...');
  const sdLegionCompany = await prisma.company.create({
    data: { name: 'SD Legion', email: 'jennifer@SDLEGION.com' }
  });
  console.log(`  ✅ Created company: ${sdLegionCompany.name}`);
  
  const frontWaveCompany = await prisma.company.create({
    data: { name: 'Front Wave Arena Mgmt' }
  });
  console.log(`  ✅ Created company: ${frontWaveCompany.name}`);
  
  // 6. Create Jobs
  console.log('🛠️ Creating jobs...');
  const sdLegionJob = await prisma.job.create({
    data: {
      name: 'USD Rugby Install',
      po_number: 'L011-25',
      companyId: sdLegionCompany.id,
      status: 'Active',
    }
  });
  console.log(`  ✅ Created job: ${sdLegionJob.name}`);

  const frontWaveJob = await prisma.job.create({
    data: {
      name: 'Floor roll out',
      po_number: 'NBA Floor',
      companyId: frontWaveCompany.id,
      status: 'Active'
    }
  });
  console.log(`  ✅ Created job: ${frontWaveJob.name}`);

  // 7. Create Shifts, Assignments, and Time Entries
  console.log('📅 Creating shifts, assignments, and time entries...');

  // --- SD Legion Shift 1: June 6, 2025 @ 11a ---
  const sdLegionShift1Date = new Date('2025-06-06T00:00:00.000Z');
  const sdLegionShift1 = await prisma.shift.create({
      data: {
          date: sdLegionShift1Date,
          startTime: parseTime(sdLegionShift1Date, '11:00am'),
          endTime: parseTime(sdLegionShift1Date, '5:30pm'),
          jobId: sdLegionJob.id,
          requestedWorkers: 13,
          status: 'Pending',
      }
  });
  console.log(`  📋 Created shift for ${sdLegionJob.name} on ${sdLegionShift1.date.toDateString()}`);
  
  const sdLegionShift1Assignments = [
    { name: 'Ryley Holmes', role: 'CC', times: ['11:00 AM', '4:00 PM', '4:30 PM', '5:30 PM'] },
    { name: 'Lonzie belcher Sr', role: 'TRK', times: ['11:00 AM', '4:00 PM', '4:30 PM', '5:30 PM'] },
    { name: 'Deshawn Wallace', role: 'SH', times: ['11:00 AM', '4:00 PM', '4:30 PM', '5:30 PM'] },
    { name: 'Marjaan Flournoy', role: 'SH', times: ['11:00 AM', '3:00 PM'] },
    { name: 'Ed Shiloff', role: 'SH', times: ['11:00 AM', '4:00 PM', '4:30 PM', '5:30 PM'] },
    { name: 'Erik Santos', role: 'SH', times: ['11:00 AM', '4:00 PM', '4:30 PM', '5:30 PM'] },
    { name: 'Raymont Duke', role: 'SH', times: ['11:00 AM', '4:00 PM', '4:30 PM', '5:30 PM'] },
    { name: 'Nikko Biteramos', role: 'PR', times: ['11:00 AM', '4:00 PM', '4:30 PM', '5:30 PM'] },
    { name: 'Jonas Charles', role: 'PR', times: ['11:00 AM', '4:00 PM', '4:30 PM', '5:30 PM'] },
    { name: 'Eleazar Vargas', role: 'PR', times: ['11:00 AM', '4:00 PM', '4:30 PM', '5:30 PM'] },
    { name: 'Robert Cowan', role: 'PR', times: ['11:00 AM', '4:00 PM', '4:30 PM', '5:30 PM'] },
    { name: 'Ronald Burkett', role: 'PR', times: ['11:00 AM', '4:00 PM', '4:30 PM', '5:30 PM'] },
    { name: 'Kendall Walker', role: 'PR', times: ['11:00 AM', '4:00 PM', '4:30 PM', '5:30 PM'] },
  ];

  for (const assign of sdLegionShift1Assignments) {
      const personnel = await prisma.assignedPersonnel.create({
          data: { shiftId: sdLegionShift1.id, userId: userMap.get(assign.name).id, roleCode: assign.role, status: 'Assigned' }
      });
      console.log(`    → ${assign.role}: ${assign.name}`);
      for (let i = 0; i < assign.times.length; i += 2) {
        await prisma.timeEntry.create({
            data: { 
                assignedPersonnelId: personnel.id,
                timeIn: parseTime(sdLegionShift1Date, assign.times[i]),
                timeOut: parseTime(sdLegionShift1Date, assign.times[i+1]),
            }
        });
      }
  }

  // --- SD Legion Shift 2: June 7, 2025 @ 9p ---
  const sdLegionShift2Date = new Date('2025-06-07T00:00:00.000Z');
  const sdLegionShift2 = await prisma.shift.create({
      data: {
          date: sdLegionShift2Date,
          startTime: parseTime(sdLegionShift2Date, '9:00pm'),
          endTime: parseTime(sdLegionShift2Date, '11:30pm'),
          jobId: sdLegionJob.id,
          requestedWorkers: 9,
          status: 'Pending',
      }
  });
  console.log(`  📋 Created shift for ${sdLegionJob.name} on ${sdLegionShift2.date.toDateString()}`);
  
  const sdLegionShift2Assignments = [
      { name: 'Ryley Holmes', role: 'CC', times: ['9:00 PM', '11:30 PM'] },
      { name: 'Lonzie belcher Sr', role: 'TRK', times: ['9:00 PM', '11:30 PM'] },
      { name: 'Lamont Pinkney', role: 'SH', times: ['9:00 PM', '11:30 PM'] },
      { name: 'Antione Belcher', role: 'SH', times: ['9:00 PM', '11:30 PM'] },
      { name: 'Ed Shiloff', role: 'SH', times: ['9:00 PM', '11:30 PM'] },
      { name: 'Erik Santos', role: 'SH', times: ['9:00 PM', '11:30 PM'] },
      { name: 'Aldonna Figiel', role: 'SH', times: ['9:00 PM', '11:30 PM'] },
      { name: 'Michael Byrd', role: 'SH', times: ['9:00 PM', '11:30 PM'] },
      { name: 'Nikko Biteramos', role: 'PR', times: ['9:00 PM', '11:30 PM'] },
      // Assuming Ronald Burkhart is a typo for Ronald Burkett
      { name: 'Ronald Burkett', role: 'PR', times: ['9:00 PM', '11:30 PM'] },
      { name: 'Robert Cowan', role: 'PR', times: ['9:00 PM', '11:30 PM'] },
      { name: 'Jonas Charles', role: 'PR', times: ['9:00 PM', '11:30 PM'] },
  ];

  for (const assign of sdLegionShift2Assignments) {
    if (userMap.has(assign.name)) {
        const personnel = await prisma.assignedPersonnel.create({
            data: { shiftId: sdLegionShift2.id, userId: userMap.get(assign.name).id, roleCode: assign.role, status: 'Assigned' }
        });
        console.log(`    → ${assign.role}: ${assign.name}`);
        await prisma.timeEntry.create({
            data: { 
                assignedPersonnelId: personnel.id,
                timeIn: parseTime(sdLegionShift2Date, assign.times[0]),
                timeOut: parseTime(sdLegionShift2Date, assign.times[1]),
            }
        });
    }
  }

  // --- Front Wave Shift: Oct 16, 2024 @ 7p ---
  const frontWaveShiftDate = new Date('2024-10-16T00:00:00.000Z');
  const frontWaveShift = await prisma.shift.create({
      data: {
          date: frontWaveShiftDate,
          startTime: parseTime(frontWaveShiftDate, '7:00pm'),
          endTime: parseTime(frontWaveShiftDate, '2:00am'), // next day
          jobId: frontWaveJob.id,
          requestedWorkers: 6,
          status: 'Completed', // This date is in the past
      }
  });
  console.log(`  📋 Created shift for ${frontWaveJob.name} on ${frontWaveShift.date.toDateString()}`);
  
  const frontWaveAssignments = [
      { name: 'Dan Martin', role: 'CC', times: ['7:00 PM', '11:00 PM', '11:30 PM', '2:00 AM'] },
      // Assuming Ed Shilof is Ed Shiloff
      { name: 'Ed Shiloff', role: 'SH', times: ['7:00 PM', '11:00 PM', '11:30 PM', '2:00 AM'] },
      { name: 'Kayley Palmeieri', role: 'SH', times: ['7:00 PM', '11:00 PM', '11:30 PM', '2:00 AM'] },
      { name: 'Ryley Holmes', role: 'SH', times: ['7:00 PM', '11:00 PM', '11:30 PM', '2:00 AM'] },
      { name: 'Ulyses DeAnda', role: 'SH', times: ['7:00 PM', '11:00 PM', '11:30 PM', '2:00 AM'] },
      { name: 'Laura Harvey', role: 'SH', times: ['7:00 PM', '11:00 PM', '11:30 PM', '2:00 AM'] },
  ];
  
  for (const assign of frontWaveAssignments) {
    if (userMap.has(assign.name)) {
        const personnel = await prisma.assignedPersonnel.create({
            data: { shiftId: frontWaveShift.id, userId: userMap.get(assign.name).id, roleCode: assign.role, status: 'Assigned' }
        });
        console.log(`    → ${assign.role}: ${assign.name}`);
        for (let i = 0; i < assign.times.length; i += 2) {
            let timeIn = parseTime(frontWaveShiftDate, assign.times[i]);
            let timeOut = parseTime(frontWaveShiftDate, assign.times[i+1]);
            // Handle overnight shifts for timeout
            if (timeOut < timeIn) {
                timeOut.setDate(timeOut.getDate() + 1);
            }
            await prisma.timeEntry.create({
                data: { assignedPersonnelId: personnel.id, timeIn, timeOut }
            });
        }
    }
  }

  console.log('🎉 Database seeding completed successfully!');
  console.log('');
  console.log('📊 Summary:');
  console.log(`  • Companies: 2`);
  console.log(`  • Jobs: 2`);
  console.log(`  • Shifts: 3`);
  console.log(`  • Employees: ${employeeData.length}`);
  console.log('');
  console.log('🔑 Login credentials:');
  console.log('  • admin@example.com / password123 (Admin)');
  console.log('  • ryley92@gmail.com / password123 (Admin)');
  console.log('  • All other users / password123');

}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });