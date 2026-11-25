import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const TRANSIENT_DB_CODES = new Set(["P1001", "P1017", "P2024"]);

export function isTransientDbError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: string; message?: string };
  if (err.code && TRANSIENT_DB_CODES.has(err.code)) return true;
  const msg = err.message || "";
  return (
    msg.includes("Server has closed the connection") ||
    msg.includes("Can't reach database server") ||
    msg.includes("Timed out fetching a new connection") ||
    msg.includes("ECONNRESET")
  );
}

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  client.$use(async (params, next) => {
    const maxRetries = 2;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await next(params);
      } catch (error) {
        if (!isTransientDbError(error) || attempt === maxRetries) {
          throw error;
        }
        await client.$connect().catch(() => {});
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      }
    }
    throw new Error("Unreachable database retry state");
  });

  return client;
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export async function withDbRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isTransientDbError(error) || attempt === maxRetries) {
        throw error;
      }
      await db.$connect().catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
  throw lastError;
}
