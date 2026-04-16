import sys
import re

with open("worker.ts", "r") as f:
    content = f.read()

# Make sure we query the new fields
search = """          const commentsToBatch = await prisma.processedComment.findMany({"""
replace = """          // Get repository configuration for templates and prompts
          const repoConfig = await prisma.repository.findUnique({
            where: { owner_name: { owner: session.repoOwner, name: session.repoName } }
          });
          const aiSystemPrompt = repoConfig?.aiSystemPrompt;
          const commentTemplate = repoConfig?.commentTemplate;

          const commentsToBatch = await prisma.processedComment.findMany({"""

content = content.replace(search, replace)

search_generate = """          if (commentsToBatch.length > 0) {
            let aggregatedBody = `### 🤖 Automated Reviewer Comments Aggregated\\n\\n`

            for (const comment of commentsToBatch) {
              aggregatedBody += `#### From **@${comment.author}**:\\n`
              aggregatedBody += `${comment.body}\\n\\n---\\n\\n`
            }"""

replace_generate = """          if (commentsToBatch.length > 0) {
            let aggregatedBody = `### 🤖 Automated Reviewer Comments Aggregated\\n\\n`

            if (aiSystemPrompt) {
              aggregatedBody += `${aiSystemPrompt}\\n\\n---\\n\\n`
            }

            const rawJsonData = [];

            for (const comment of commentsToBatch) {
              rawJsonData.push({
                author: comment.author,
                body: comment.body,
                source: comment.source
              });

              // Simple tag generation based on keywords
              const lowerBody = comment.body.toLowerCase();
              let actionTag = '';
              if (lowerBody.includes('error') || lowerBody.includes('failed') || lowerBody.includes('critical')) {
                actionTag = '[ACTION: FIX_ERROR] ';
              } else if (lowerBody.includes('warn') || lowerBody.includes('suggestion') || lowerBody.includes('review')) {
                actionTag = '[ACTION: REVIEW] ';
              } else if (lowerBody.includes('security') || lowerBody.includes('vulnerability')) {
                actionTag = '[ACTION: SEC_REVIEW] ';
              }

              if (commentTemplate) {
                let formattedComment = commentTemplate
                  .replace(/\\{\\{bot_name\\}\\}/g, comment.author)
                  .replace(/\\{\\{body\\}\\}/g, comment.body)
                  .replace(/\\{\\{action_tag\\}\\}/g, actionTag);
                aggregatedBody += `${formattedComment}\\n\\n---\\n\\n`;
              } else {
                aggregatedBody += `#### From **@${comment.author}** ${actionTag ? `\\n${actionTag}` : ''}\\n`
                aggregatedBody += `${comment.body}\\n\\n---\\n\\n`
              }
            }

            // Inject JSON data block as an HTML comment
            const jsonString = JSON.stringify(rawJsonData, null, 2);
            aggregatedBody += `\\n<!-- JSON_START\\n${jsonString}\\nJSON_END -->\\n`;"""

content = content.replace(search_generate, replace_generate)

with open("worker.ts", "w") as f:
    f.write(content)
