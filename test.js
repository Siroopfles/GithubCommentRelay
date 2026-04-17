const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
  const reviewers = await prisma.targetReviewer.findMany();
  console.log("REVIEWERS:", reviewers);
}
main().finally(() => prisma.$disconnect());
