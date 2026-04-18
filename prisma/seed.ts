import { PrismaClient } from '../src/lib/prisma-client-final';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const adapter = new PrismaMariaDb("mysql://root:@localhost:3307/PFE_esst");
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPassword = await bcrypt.hash('pass123', 12);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@esst-sup.com' },
    update: {},
    create: {
      id: randomUUID(),
      name: 'System Admin',
      email: 'admin@esst-sup.com',
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
      mustChangePassword: false,
      updatedAt: new Date(),
      adminProfile: {
        create: {
          id: randomUUID(),
          isSuperAdmin: true
        }
      }
    }
  });

  // Also add some base settings
  await prisma.systemSettings.upsert({
    where: { key: 'current_academic_year' },
    update: {},
    create: {
      id: randomUUID(),
      key: 'current_academic_year',
      value: '2024-2025',
      updatedAt: new Date()
    }
  });

  await prisma.systemSettings.upsert({
    where: { key: 'available_specialities' },
    update: {},
    create: {
      id: randomUUID(),
      key: 'available_specialities',
      value: JSON.stringify(['Computer Science', 'Cybersecurity', 'AI']),
      updatedAt: new Date()
    }
  });

  await prisma.systemSettings.upsert({
    where: { key: 'available_promotions' },
    update: {},
    create: {
      id: randomUUID(),
      key: 'available_promotions',
      value: JSON.stringify(['M1 GL', 'M2 GL', 'L3 CS']),
      updatedAt: new Date()
    }
  });

  console.log("Seed successful! Admin: admin@esst-sup.com / pass123");
}

main().catch(console.error).finally(() => prisma.$disconnect());
