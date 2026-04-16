import sys

with open("prisma/schema.prisma", "r") as f:
    content = f.read()

search = """  julesChatForwardDelay Int      @default(5) // In minutes
  createdAt             DateTime @default(now())"""

replace = """  julesChatForwardDelay Int      @default(5) // In minutes
  aiSystemPrompt        String? // Top-level prompt for AI bots
  commentTemplate       String? // Markdown template for individual bot comments
  createdAt             DateTime @default(now())"""

content = content.replace(search, replace)

with open("prisma/schema.prisma", "w") as f:
    f.write(content)
