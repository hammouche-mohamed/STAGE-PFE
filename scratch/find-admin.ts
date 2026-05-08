import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  });
  console.log('Admin user:', admin ? { email: admin.email, role: admin.role } : 'None found');
}

main().catch(console.error).finally(() => prisma.$disconnect());
