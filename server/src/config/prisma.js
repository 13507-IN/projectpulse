import { PrismaClient } from "@prisma/client";

// Create a singleton instance of Prisma Client
const globalForPrisma = globalThis;

// Configure Prisma Client with connection pooling
const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL + (process.env.NODE_ENV === 'production' ? '?connection_limit=20' : '')
    }
  }
});

// Prevent multiple instances of Prisma Client in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Handle process events for cleanup
process.on('beforeExit', async () => {
  console.log('Application is shutting down. Cleaning up...');
  await prisma.$disconnect();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit if we're in development
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

export default prisma;
