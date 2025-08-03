const { prisma } = require('./src/lib/prisma');

async function checkTables() {
  try {
    console.log('🔍 Checking database tables and schema...');
    
    // Check if we can query the information schema
    const tables = await prisma.$queryRaw`
      SELECT table_name, table_schema 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    console.log('\n📋 Tables in public schema:');
    tables.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });
    
    // Check specific tables
    console.log('\n🔍 Checking specific table data:');
    
    try {
      const userCount = await prisma.user.count();
      console.log(`✅ Users table: ${userCount} records`);
    } catch (error) {
      console.log(`❌ Users table error: ${error.message}`);
    }
    
    try {
      const companyCount = await prisma.company.count();
      console.log(`✅ Companies table: ${companyCount} records`);
    } catch (error) {
      console.log(`❌ Companies table error: ${error.message}`);
    }
    
    try {
      const jobCount = await prisma.job.count();
      console.log(`✅ Jobs table: ${jobCount} records`);
    } catch (error) {
      console.log(`❌ Jobs table error: ${error.message}`);
    }
    
    try {
      const shiftCount = await prisma.shift.count();
      console.log(`✅ Shifts table: ${shiftCount} records`);
    } catch (error) {
      console.log(`❌ Shifts table error: ${error.message}`);
    }
    
    // Check database connection info
    const connectionInfo = await prisma.$queryRaw`
      SELECT 
        current_database() as database_name,
        current_user as current_user,
        version() as postgres_version
    `;
    
    console.log('\n🔗 Connection info:');
    console.log(`  Database: ${connectionInfo[0].database_name}`);
    console.log(`  User: ${connectionInfo[0].current_user}`);
    console.log(`  Version: ${connectionInfo[0].postgres_version}`);
    
  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();
