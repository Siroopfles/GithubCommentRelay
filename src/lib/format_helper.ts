export function formatAggregatedBody(commentsToBatch: any[], aiSystemPrompt?: string | null, commentTemplate?: string | null): string {
  let aggregatedBody = `### 🤖 Automated Reviewer Comments Aggregated\n\n`;

  if (aiSystemPrompt) {
    aggregatedBody += `${aiSystemPrompt}\n\n---\n\n`;
  }

  const rawJsonData = [];

  // Deduplication
  const deduplicatedComments: any[] = [];
  const normalize = (str: string) => str.trim().replace(/\s+/g, ' ').toLowerCase();

  for (const comment of commentsToBatch) {
    // Simple deduplication based on exact body match or highly similar body
    if (!comment.body || comment.body.trim() === '') continue;

    const normalizedBody = normalize(comment.body);
    const existing = deduplicatedComments.find(c =>
      c.author === comment.author &&
      c.normalizedBody === normalizedBody
    );

    if (existing) {
      existing.count = (existing.count || 1) + 1;
      // If the new comment has more context (is longer), use it instead
      if (comment.body.length > existing.body.length) {
        existing.body = comment.body;
      }
    } else {
      deduplicatedComments.push({ ...comment, count: 1, normalizedBody });
    }
  }

  // Assign action tags and sort priority
  const commentsWithTags = deduplicatedComments.map(comment => {
    const lowerBody = comment.body.toLowerCase();
    let actionTag = '';
    let priority = 3;

    // Ordered priority: Security > Fix Error > Review
    let cleanBody = comment.body;
    const tagMatch = lowerBody.match(/\[ACTION:(.*?)\]/i);
    if (tagMatch) {
      actionTag = `[ACTION:${tagMatch[1].toUpperCase()}]`;
      if (actionTag.includes('SEC_REVIEW')) priority = 1;
      else if (actionTag.includes('FIX_ERROR')) priority = 2;
      else priority = 3;

      const originalCaseMatch = comment.body.match(new RegExp('\\[ACTION:(.*?)\\]', 'i'));
      if (originalCaseMatch) {
        cleanBody = comment.body.replace(originalCaseMatch[0], '').trim();
      }
    } else if (/\b(security|vulnerabilit(y|ies))\b/i.test(lowerBody)) {
      actionTag = '[ACTION: SEC_REVIEW]';
      priority = 1;
    } else if (/\b(error(s)?|fail(ed|s|ing|ure(s)?)?|critical(ly)?)\b/i.test(lowerBody)) {
      actionTag = '[ACTION: FIX_ERROR]';
      priority = 2;
    } else if (/\b(warn(ing(s)?)?|suggestion(s)?|review(s|ed|ing)?)\b/i.test(lowerBody)) {
      actionTag = '[ACTION: REVIEW]';
      priority = 3;
    }

    return { ...comment, body: cleanBody, actionTag, priority };
  });

  // Sort by priority (ascending: 1 is highest)
  commentsWithTags.sort((a, b) => a.priority - b.priority);

  // Process sorted and deduplicated comments
  for (const comment of commentsWithTags) {
    rawJsonData.push({
      author: comment.author,
      body: comment.body,
      source: comment.source,
      count: comment.count,
      actionTag: comment.actionTag
    });

    let displayBody = comment.body;

    // Diff extraction and highlighting
    if (displayBody.includes('```diff')) {
        // Find codeblocks and wrap them or add a note
        displayBody = displayBody.replace(/(```diff[\s\S]*?```)/g, '\n**⚠️ Suggested Code Changes:**\n$1\n');
    }

    const countLabel = comment.count > 1 ? `\n**[Reported ${comment.count}x]**` : '';

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
      aggregatedBody += `#### From **@${comment.author}**`;
      if (comment.actionTag) aggregatedBody += `\n${comment.actionTag}`;
      if (countLabel) aggregatedBody += `${countLabel}`;
      aggregatedBody += `\n`;
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
