import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

const prismaClientSingleton = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
  }

  // PrismaMariaDb is a factory that handles pool creation internally.
  // We pass the connection string directly.
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL);

  return new PrismaClient({ adapter });
};

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}

export default prisma;
