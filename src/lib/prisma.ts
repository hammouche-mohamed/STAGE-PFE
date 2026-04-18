import { PrismaClient } from "./prisma-client-final";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const prismaClientSingleton = () => {
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL!, {
    // Limit connection pool to avoid "too many connections" errors
    connectionLimit: 5,
    idleTimeout: 10000,
    connectTimeout: 10000,
  });
  return new PrismaClient({ adapter });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

// IMPORTANT: Check global FIRST, create only if not exists
// This prevents new connections on every HMR reload in dev
const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

export default prisma;
