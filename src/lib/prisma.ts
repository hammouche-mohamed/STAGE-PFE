import { PrismaClient } from "./prisma-client-final";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import * as mariadb from "mariadb";

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
  var _mariadbPool: mariadb.Pool | undefined;
}

const getPool = () => {
  const url = new URL(process.env.DATABASE_URL!);
  const poolConfig = {
    host: url.hostname,
    port: parseInt(url.port || "3306", 10),
    user: url.username,
    password: url.password || undefined,
    database: url.pathname.slice(1), // remove leading slash
    connectionLimit: process.env.NODE_ENV === "production" ? 10 : 5,
  };

  if (process.env.NODE_ENV === "production") {
    return mariadb.createPool(poolConfig);
  }
  
  if (!globalThis._mariadbPool) {
    globalThis._mariadbPool = mariadb.createPool(poolConfig);
  }
  return globalThis._mariadbPool;
};

const prismaClientSingleton = () => {
  const pool = getPool();
  const adapter = new PrismaMariaDb(pool);
  return new PrismaClient({ adapter });
};

// IMPORTANT: Check global FIRST, create only if not exists
// This prevents new connections on every HMR reload in dev
const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

export default prisma;
