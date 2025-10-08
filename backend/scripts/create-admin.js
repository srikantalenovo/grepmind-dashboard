import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createDefaultAdmin() {
  try {
    console.log('🔧 Creating default admin user...');
    
    // Check if admin user exists
    const existingAdmin = await prisma.user.findFirst({
      where: { email: 'admin@grepmind.com' }
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      
      // Ensure the user has admin role and is active
      const updatedAdmin = await prisma.user.update({
        where: { email: 'admin@grepmind.com' },
        data: {
          role: 'admin',
          isActive: true
        }
      });
      
      console.log(`✅ Admin user verified: ${updatedAdmin.email}`);
      console.log(`👤 Role: ${updatedAdmin.role}`);
      console.log(`🟢 Active: ${updatedAdmin.isActive}`);
    } else {
      // Create new admin user
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
      
      console.log(`✅ Default admin user created: ${admin.email}`);
      console.log('🔐 Default admin password: admin123!@#');
      console.log('⚠️  Please change the default admin password after first login!');
    }

    // List all admin users for verification
    const adminUsers = await prisma.user.findMany({
      where: { role: 'admin' },
      select: {
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    console.log('\n📋 Current admin users:');
    adminUsers.forEach(user => {
      console.log(`  - ${user.email} (${user.name}) - Active: ${user.isActive}`);
    });

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDefaultAdmin();
