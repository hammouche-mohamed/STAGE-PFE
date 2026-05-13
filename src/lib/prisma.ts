import { PrismaClient } from "@prisma/client";

// In serverless environments (Vercel), each function invocation can spawn a new
// Prisma client. Without connection_limit, this quickly exhausts the DB's max connections.
// We cap at 3 connections per serverless instance and apply a global singleton.
const getConnectionUrl = () => {
  const url = process.env.DATABASE_URL || "";
  // Add connection pooling params only if not already present
  if (url && !url.includes("connection_limit")) {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}connection_limit=10&pool_timeout=30`;
  }
  return url;
};

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: {
      db: {
        url: getConnectionUrl(),
      },
    },
  });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
