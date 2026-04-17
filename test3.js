const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
  const pr9Sessions = await prisma.batchSession.findMany({ where: { prNumber: 9 } });
  const pr9Comments = await prisma.processedComment.findMany({ where: { prNumber: 9 } });
  console.log("SESSIONS:\n", pr9Sessions);
  console.log("COMMENTS:\n", pr9Comments);
}
main().finally(() => prisma.$disconnect());
