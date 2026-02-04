import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
    prismaInstance: PrismaClient | undefined;
};

export const prisma =
    globalForPrisma.prismaInstance ??
    new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    });

if (process.env.NODE_ENV !== "production") globalForPrisma.prismaInstance = prisma;
