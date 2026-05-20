// Read-only verification of the milestone schema changes.
// Prints column layout, enum values, row count by status, and migration history.
// Run with:  node scripts/verify-milestone-schema.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function table(rows) {
  if (!rows.length) return "  (empty)";
  const keys = Object.keys(rows[0]);
  const widths = keys.map((k) =>
    Math.max(k.length, ...rows.map((r) => String(r[k] ?? "").length)),
  );
  const header = "  " + keys.map((k, i) => k.padEnd(widths[i])).join("  ");
  const sep = "  " + widths.map((w) => "-".repeat(w)).join("  ");
  const body = rows
    .map((r) => "  " + keys.map((k, i) => String(r[k] ?? "").padEnd(widths[i])).join("  "))
    .join("\n");
  return [header, sep, body].join("\n");
}

async function section(title, fn) {
  console.log("\n=== " + title + " ===");
  try {
    const out = await fn();
    console.log(typeof out === "string" ? out : table(out));
  } catch (err) {
    console.log("  ERROR: " + err.message);
  }
}

async function main() {
  await section("1. minipresentation columns", async () => {
    return prisma.$queryRaw`
      SELECT COLUMN_NAME AS field, COLUMN_TYPE AS type, IS_NULLABLE AS nullable
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'minipresentation'
      ORDER BY ORDINAL_POSITION
    `;
  });

  await section("2. minipresentation.status enum values", async () => {
    const rows = await prisma.$queryRaw`
      SELECT COLUMN_TYPE AS column_type
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'minipresentation'
        AND COLUMN_NAME = 'status'
    `;
    return "  " + (rows[0]?.column_type ?? "(not found)");
  });

  await section("3. row count by status", async () => {
    return prisma.$queryRaw`
      SELECT status, COUNT(*) AS n
      FROM minipresentation
      GROUP BY status
      ORDER BY n DESC
    `;
  });

  await section("4. expected new reminder columns present?", async () => {
    return prisma.$queryRaw`
      SELECT COLUMN_NAME AS field
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'minipresentation'
        AND COLUMN_NAME IN ('remindedAt24h','remindedAt4h','remindedAt1h','missedNotifiedAt')
      ORDER BY COLUMN_NAME
    `;
  });

  await section("5. prisma migration history (last 5)", async () => {
    try {
      return await prisma.$queryRaw`
        SELECT migration_name, finished_at
        FROM _prisma_migrations
        ORDER BY finished_at DESC
        LIMIT 5
      `;
    } catch {
      return "  (no _prisma_migrations table — schema was pushed with `prisma db push`, not migrate)";
    }
  });
}

main()
  .catch((err) => {
    console.error("\nFATAL:", err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
