import * as fs from 'fs';

let content = fs.readFileSync('prisma/schema.prisma', 'utf8');

const repositoryRegex = /model Repository {([\s\S]*?)@@unique\(\[owner, name\]\)\n}/;

const newRepositoryContent = `model Repository {
  id                    String   @id @default(cuid())
  owner                 String
  name                  String
  isActive              Boolean  @default(true)
  autoMergeEnabled      Boolean  @default(false)
  requiredApprovals     Int      @default(1)
  requireCI             Boolean  @default(true)
  mergeStrategy         String   @default("merge") // 'merge', 'squash', 'rebase'
  taskSourceType        String   @default("none") // 'none', 'local_folder', 'github_issues'
  taskSourcePath        String? // Path to folder if taskSourceType is 'local_folder'
  maxConcurrentTasks    Int      @default(3) // Limits AI tasks running simultaneously
  julesPromptTemplate   String? // Template for the prompt
  julesChatForwardMode  String   @default("off") // 'off', 'always', 'failsafe'
  julesChatForwardDelay Int      @default(5) // In minutes
  aiSystemPrompt        String? // Top-level prompt for AI bots
  commentTemplate       String? // Markdown template for individual bot comments
  postAggregatedComments Boolean  @default(true)
  batchDelay            Int?
  branchWhitelist       String?
  branchBlacklist       String?
  githubToken           String?
  requiredBots          String?
  createdAt             DateTime @default(now())

  tasks                 Task[]

  @@unique([owner, name])
}`;

content = content.replace(repositoryRegex, newRepositoryContent);

const taskModel = `
model Task {
  id                String     @id @default(cuid())
  repositoryId      String
  repository        Repository @relation(fields: [repositoryId], references: [id], onDelete: Cascade)
  title             String
  body              String?
  status            String     @default("backlog") // backlog, todo, in_progress, in_review, blocked, done
  source            String     @default("manual")  // local_folder, github_issue, manual
  priority          Int        @default(0)         // Higher number = higher priority
  githubIssueNumber Int?
  julesSessionId    String?
  prNumber          Int?
  contextFiles      String?    // JSON array of file paths
  createdAt         DateTime   @default(now())
  updatedAt         DateTime   @updatedAt

  @@index([repositoryId, status])
}
`;

content += taskModel;

fs.writeFileSync('prisma/schema.prisma', content);
