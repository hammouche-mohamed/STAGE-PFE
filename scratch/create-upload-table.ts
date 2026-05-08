import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS upload (
        id VARCHAR(191) NOT NULL,
        fileName VARCHAR(191) NOT NULL,
        fileType VARCHAR(191) NOT NULL,
        content LONGBLOB NOT NULL,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log('Table "upload" ensured.');
  } catch (error) {
    console.error('Error creating table:', error);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
