import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // 1. Create default admin user
    await createDefaultAdmin();
    
    // 2. Create sample viewer user for testing
    await createSampleUsers();
    
    console.log('✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function createDefaultAdmin() {
  try {
    console.log('👤 Creating default admin user...');
    
    // Delete existing admin if needed (for fresh setup)
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@grepmind.com' }
    });

    if (existingAdmin) {
      console.log('🔄 Updating existing admin user...');
      const hashedPassword = await bcrypt.hash('admin123!@#', 12);
      
      await prisma.user.update({
        where: { email: 'admin@grepmind.com' },
        data: {
          password: hashedPassword,
          name: 'Default Admin',
          role: 'admin',
          isActive: true
        }
      });
      
      console.log('✅ Admin user updated');
    } else {
      console.log('🆕 Creating new admin user...');
      const hashedPassword = await bcrypt.hash('admin123!@#', 12);
      
      const admin = await prisma.user.create({
        data: {
          email: 'admin@grepmind.com',
          password: hashedPassword,
          name: 'Default Admin',
          role: 'admin',
          isActive: true
        }
      });
      
      console.log(`✅ Admin user created: ${admin.email}`);
    }

    console.log('🔐 Admin credentials: admin@grepmind.com / admin123!@#');
  } catch (error) {
    console.error('❌ Failed to create admin user:', error);
    throw error;
  }
}

async function createSampleUsers() {
  try {
    console.log('👥 Creating sample users...');
    
    const sampleUsers = [
      {
        email: 'editor@grepmind.com',
        password: 'editor123',
        name: 'Sample Editor',
        role: 'editor'
      },
      {
        email: 'viewer@grepmind.com',
        password: 'viewer123',
        name: 'Sample Viewer',
        role: 'viewer'
      }
    ];

    for (const userData of sampleUsers) {
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(userData.password, 12);
        
        const user = await prisma.user.create({
          data: {
            email: userData.email,
            password: hashedPassword,
            name: userData.name,
            role: userData.role,
            isActive: true
          }
        });
        
        console.log(`✅ Sample user created: ${user.email} (${user.role})`);
      } else {
        console.log(`👤 Sample user already exists: ${userData.email}`);
      }
    }
  } catch (error) {
    console.error('❌ Failed to create sample users:', error);
    // Don't throw - sample users are optional
  }
}

// Run the seeding
seedDatabase()
  .then(() => {
    console.log('🎉 Database seeding completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Database seeding failed:', error);
    process.exit(1);
  });
