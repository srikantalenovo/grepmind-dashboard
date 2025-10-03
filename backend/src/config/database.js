import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient();

export { prisma };

// Database connection function
export const connectDB = async () => {
  try {
    await prisma.$connect();
    logger.info('✅ Connected to PostgreSQL database');
    
    // Create default admin user if it doesn't exist
    await createDefaultAdmin();
    
    return prisma;
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

// Create default admin user
const createDefaultAdmin = async () => {
  try {
    const adminExists = await prisma.user.findFirst({
      where: { role: 'admin' }
    });
    
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123!@#', 12);
      
      const admin = await prisma.user.create({
        data: {
          email: 'admin@grepmind.com',
          password: hashedPassword,
          name: 'Default Admin',
          role: 'admin'
        }
      });
      
      logger.info(`✅ Default admin user created: ${admin.email}`);
      logger.info('🔐 Default admin password: admin123!@#');
      logger.warn('⚠️  Please change the default admin password after first login!');
    }
  } catch (error) {
    logger.error('Failed to create default admin user:', error);
  }
};

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  logger.info('📴 Database connection closed');
});
