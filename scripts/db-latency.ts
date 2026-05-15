/**
 * DB latency diagnostic — READ ONLY. Changes nothing.
 *
 * Run:  npx tsx scripts/db-latency.ts
 *
 * Tells you where the ~1–1.5 s actually goes: TCP/TLS connect, a trivial
 * round-trip, or the real query work — so you know whether to fix the app,
 * the query, or the database location.
 */
import prisma from "../src/lib/prisma";

function ms(n: number) {
  return `${n.toFixed(0)} ms`;
}

async function time<T>(label: string, fn: () => Promise<T>): Promise<number> {
  const t0 = performance.now();
  await fn();
  const dt = performance.now() - t0;
  console.log(`  ${label.padEnd(42)} ${ms(dt).padStart(9)}`);
  return dt;
}

async function main() {
  const host = (process.env.DATABASE_URL || "").replace(/:[^:@/]*@/, ":***@");
  console.log("\n── DB latency diagnostic ───────────────────────────────");
  console.log("  Target:", host.split("@")[1]?.split("/")[0] ?? "(unknown)");
  console.log("────────────────────────────────────────────────────────");

  // 1. Cold connect (TCP + TLS handshake + auth)
  await time("Cold connect ($connect)", () => prisma.$connect());

  // 2. Trivial round-trip — pure network latency, no query work
  const pings: number[] = [];
  for (let i = 0; i < 5; i++) {
    pings.push(
      await time(`Round-trip SELECT 1  (#${i + 1})`, () =>
        prisma.$queryRawUnsafe("SELECT 1"),
      ),
    );
  }
  const avgPing = pings.reduce((a, b) => a + b, 0) / pings.length;

  // 3. Representative real queries (same shape the app issues)
  await time("user.count()", () => prisma.user.count());

  await time("users list + profiles (like /api/users)", () =>
    (prisma as any).user.findMany({
      take: 50,
      include: {
        studentprofile: true,
        teacherprofile: true,
        adminprofile: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  );

  await time("topics list (like /api/topics)", () =>
    (prisma as any).topic
      .findMany({ take: 50, orderBy: { createdAt: "desc" } })
      .catch(() => []),
  );

  // 4. Warm round-trip again (connection now established/pooled)
  const warm = await time("Round-trip SELECT 1  (warm)", () =>
    prisma.$queryRawUnsafe("SELECT 1"),
  );

  console.log("────────────────────────────────────────────────────────");
  console.log(`  Avg pure network round-trip: ~${ms(avgPing)}`);
  console.log(
    `  → If SELECT 1 alone is ${ms(avgPing)}, the lag is the remote DB\n` +
      `    distance, NOT the query or the app code. Each page that\n` +
      `    fires several queries pays that round-trip several times.`,
  );
  console.log("────────────────────────────────────────────────────────\n");

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("Diagnostic failed:", e);
  await prisma.$disconnect();
  process.exit(1);
});
