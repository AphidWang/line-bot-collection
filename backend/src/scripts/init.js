const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting database initialization...');

  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connection successful');

    // Create default admin user if not exists
    const adminEmail = 'admin@lineassistant.com';
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      const adminUser = await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: 'Admin User'
        }
      });

      console.log('✅ Admin user created:', adminUser.email);
    } else {
      console.log('ℹ️ Admin user already exists');
    }

    // Create sample channel if not exists
    const sampleChannelId = 'sample-channel-001';
    const existingChannel = await prisma.channel.findUnique({
      where: { lineId: sampleChannelId }
    });

    if (!existingChannel) {
      const sampleChannel = await prisma.channel.create({
        data: {
          lineId: sampleChannelId,
          name: 'Sample Channel',
          status: 'active'
        }
      });

      console.log('✅ Sample channel created:', sampleChannel.name);
    } else {
      console.log('ℹ️ Sample channel already exists');
    }

    console.log('🎉 Database initialization completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Set up your environment variables in .env file');
    console.log('2. Configure Line Bot webhook URL');
    console.log('3. Start the server with: npm run dev');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
