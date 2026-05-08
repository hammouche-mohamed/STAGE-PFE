import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('Student123!', 10);
  const user = await prisma.user.update({
    where: { email: 'amira@student.dz' },
    data: { password: hashedPassword, isActive: true },
  });
  console.log('User password updated and account activated:', user.email);
}

main().catch(console.error).finally(() => prisma.$disconnect());
