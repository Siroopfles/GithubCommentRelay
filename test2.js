const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
  const repo = await prisma.repository.findFirst({where:{name:'GithubCommentRelay'}});
  console.log("REPO:", repo);
}
main().finally(() => prisma.$disconnect());
