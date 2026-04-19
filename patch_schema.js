const fs = require('fs');

let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

if (!schema.includes('pruneDays')) {
  schema = schema.replace(
    'julesApiKey     String?',
    'julesApiKey     String?\n  pruneDays       Int      @default(60)\n  githubRateLimitRemaining Int? \n  githubRateLimitReset     DateTime?'
  );
}

if (!schema.includes('model WebhookSignal')) {
  schema += `\n
model WebhookSignal {
  id        String   @id @default(cuid())
  repoOwner String
  repoName  String
  prNumber  Int
  createdAt DateTime @default(now())

  @@index([repoOwner, repoName, prNumber])
}
`;
}

fs.writeFileSync('prisma/schema.prisma', schema);
console.log('Schema patched successfully.');
