export function formatAggregatedBody(commentsToBatch: any[], aiSystemPrompt?: string | null, commentTemplate?: string | null): string {
  let aggregatedBody = `### 🤖 Automated Reviewer Comments Aggregated\n\n`;

  if (aiSystemPrompt) {
    aggregatedBody += `${aiSystemPrompt}\n\n---\n\n`;
  }

  const rawJsonData = [];

  // Deduplication
  const deduplicatedComments: any[] = [];

  for (const comment of commentsToBatch) {
    // Simple deduplication based on exact body match or highly similar body
    const existing = deduplicatedComments.find(c =>
      c.author === comment.author &&
      (c.body === comment.body || c.body.includes(comment.body) || comment.body.includes(c.body))
    );

    if (existing) {
      existing.count = (existing.count || 1) + 1;
      // If the new comment has more context (is longer), use it instead
      if (comment.body.length > existing.body.length) {
        existing.body = comment.body;
      }
    } else {
      deduplicatedComments.push({ ...comment, count: 1 });
    }
  }

  // Assign action tags and sort priority
  const commentsWithTags = deduplicatedComments.map(comment => {
    const lowerBody = comment.body.toLowerCase();
    let actionTag = '';
    let priority = 3;

    // Ordered priority: Security > Fix Error > Review
    if (lowerBody.includes('security') || lowerBody.includes('vulnerability')) {
      actionTag = '[ACTION: SEC_REVIEW]';
      priority = 1;
    } else if (lowerBody.includes('error') || lowerBody.includes('failed') || lowerBody.includes('critical')) {
      actionTag = '[ACTION: FIX_ERROR]';
      priority = 2;
    } else if (lowerBody.includes('warn') || lowerBody.includes('suggestion') || lowerBody.includes('review')) {
      actionTag = '[ACTION: REVIEW]';
      priority = 3;
    }

    return { ...comment, actionTag, priority };
  });

  // Sort by priority (ascending: 1 is highest)
  commentsWithTags.sort((a, b) => a.priority - b.priority);

  // Process sorted and deduplicated comments
  for (const comment of commentsWithTags) {
    rawJsonData.push({
      author: comment.author,
      body: comment.body,
      source: comment.source,
      count: comment.count
    });

    let displayBody = comment.body;

    // Diff extraction and highlighting
    if (displayBody.includes('```diff') || displayBody.includes('```')) {
        // Find codeblocks and wrap them or add a note
        displayBody = displayBody.replace(/(```[\s\S]*?```)/g, '\n**⚠️ Suggested Code Changes:**\n$1\n');
    }

    const countLabel = comment.count > 1 ? ` **[Reported ${comment.count}x]** ` : '';

    if (commentTemplate) {
      // Split and construct to avoid injecting variables within body content replacing themselves
      const parts = commentTemplate.split('{{body}}');
      if (parts.length > 1) {
          let pre = parts[0].replace(/\{\{bot_name\}\}/g, comment.author).replace(/\{\{action_tag\}\}/g, comment.actionTag + countLabel);
          let post = parts[1].replace(/\{\{bot_name\}\}/g, comment.author).replace(/\{\{action_tag\}\}/g, comment.actionTag + countLabel);
          aggregatedBody += `${pre}${displayBody}${post}\n\n---\n\n`;
      } else {
          let formattedComment = commentTemplate
            .replace(/\{\{bot_name\}\}/g, comment.author)
            .replace(/\{\{action_tag\}\}/g, comment.actionTag + countLabel);
          aggregatedBody += `${formattedComment}\n\n---\n\n`;
      }

    } else {
      aggregatedBody += `#### From **@${comment.author}** ${comment.actionTag ? `\n${comment.actionTag}` : ''}${countLabel}\n`;
      aggregatedBody += `${displayBody}\n\n---\n\n`;
    }
  }

  // Sanitize comment.body before serialization inside rawJsonData
  const sanitizedJsonData = rawJsonData.map(item => ({
    ...item,
    body: item.body.replace(/-->/g, '--&gt;').replace(/JSON_END/g, 'JSON_END_SAFE').replace(/JSON_START/g, 'JSON_START_SAFE')
  }));

  const jsonString = JSON.stringify(sanitizedJsonData, null, 2);
  aggregatedBody += `\n<!-- JSON_START\n${jsonString}\nJSON_END -->\n`;

  return aggregatedBody;
}
