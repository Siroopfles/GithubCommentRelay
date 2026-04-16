<<<<<<< SEARCH
  julesChatForwardDelay Int      @default(5) // In minutes
  createdAt             DateTime @default(now())
=======
  julesChatForwardDelay Int      @default(5) // In minutes
  aiSystemPrompt        String? // Top-level prompt for AI bots
  commentTemplate       String? // Markdown template for individual bot comments
  createdAt             DateTime @default(now())
>>>>>>> REPLACE
