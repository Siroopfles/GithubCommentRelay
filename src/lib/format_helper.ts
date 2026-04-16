export function formatAggregatedBody(commentsToBatch: any[], aiSystemPrompt?: string | null, commentTemplate?: string | null): string {
  let aggregatedBody = `### 🤖 Automated Reviewer Comments Aggregated\n\n`;

  if (aiSystemPrompt) {
    aggregatedBody += `${aiSystemPrompt}\n\n---\n\n`;
  }

  const rawJsonData = [];

  for (const comment of commentsToBatch) {
    rawJsonData.push({
      author: comment.author,
      body: comment.body,
      source: comment.source
    });

    const lowerBody = comment.body.toLowerCase();
    let actionTag = '';

    // Ordered priority: Security > Fix Error > Review
    if (lowerBody.includes('security') || lowerBody.includes('vulnerability')) {
      actionTag = '[ACTION: SEC_REVIEW] ';
    } else if (lowerBody.includes('error') || lowerBody.includes('failed') || lowerBody.includes('critical')) {
      actionTag = '[ACTION: FIX_ERROR] ';
    } else if (lowerBody.includes('warn') || lowerBody.includes('suggestion') || lowerBody.includes('review')) {
      actionTag = '[ACTION: REVIEW] ';
    }

    if (commentTemplate) {
      // Split and construct to avoid injecting variables within body content replacing themselves
      const parts = commentTemplate.split('{{body}}');
      if (parts.length > 1) {
          let pre = parts[0].replace(/\{\{bot_name\}\}/g, comment.author).replace(/\{\{action_tag\}\}/g, actionTag);
          let post = parts[1].replace(/\{\{bot_name\}\}/g, comment.author).replace(/\{\{action_tag\}\}/g, actionTag);
          aggregatedBody += `${pre}${comment.body}${post}\n\n---\n\n`;
      } else {
          let formattedComment = commentTemplate
            .replace(/\{\{bot_name\}\}/g, comment.author)
            .replace(/\{\{action_tag\}\}/g, actionTag);
          aggregatedBody += `${formattedComment}\n\n---\n\n`;
      }

    } else {
      aggregatedBody += `#### From **@${comment.author}** ${actionTag ? `\n${actionTag}` : ''}\n`;
      aggregatedBody += `${comment.body}\n\n---\n\n`;
    }
  }

  // Sanitize comment.body before serialization inside rawJsonData
  const sanitizedJsonData = rawJsonData.map(item => ({
    ...item,
    body: item.body.replace(/-->/g, '--&gt;').replace(/JSON_END/g, 'JSON_END_SAFE')
  }));

  const jsonString = JSON.stringify(sanitizedJsonData, null, 2);
  aggregatedBody += `\n<!-- JSON_START\n${jsonString}\nJSON_END -->\n`;

  return aggregatedBody;
}
