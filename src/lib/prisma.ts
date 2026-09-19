import { PrismaClient } from "@prisma/client";
import {
  isMissingJobColumnError,
  JOB_READ_OPERATIONS,
  JOB_WRITE_OPERATIONS,
  legacyJobReadArgs,
  stripOptionalJobFieldsFromData,
} from "@/lib/job-schema-compat";

function createPrismaClient() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  return base.$extends({
    query: {
      job: {
        async $allOperations({ operation, args, query }) {
          try {
            return await query(args);
          } catch (e) {
            if (!isMissingJobColumnError(e)) throw e;
            if (JOB_READ_OPERATIONS.has(operation)) {
              return query(legacyJobReadArgs(args as Record<string, unknown>));
            }
            if (JOB_WRITE_OPERATIONS.has(operation)) {
              const next = { ...(args as Record<string, unknown>) };
              if ("data" in next) next.data = stripOptionalJobFieldsFromData(next.data);
              return query(next);
            }
            throw e;
          }
        },
      },
    },
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
