import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'amira@student.dz' },
  });
  console.log('User status:', user ? { email: user.email, isActive: user.isActive, role: user.role } : 'Not found');
}

main().catch(console.error).finally(() => prisma.$disconnect());
