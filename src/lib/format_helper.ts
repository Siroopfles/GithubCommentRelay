export function formatAggregatedBody(commentsToBatch: any[], aiSystemPrompt?: string | null, commentTemplate?: string | null, isHighPriority?: boolean, manualPrompt?: string | null, botMappings?: {botSource: string, agentName: string, role?: string | null}[]): string {
  let aggregatedBody = `### 🤖 Automated Reviewer Comments Aggregated\n\n`;

  if (isHighPriority) {
    aggregatedBody += `🚨 [PRIORITY: HIGH] @ai-agent Please process this PR with high priority.\n\n`;
  }

  if (manualPrompt) {
    aggregatedBody += `**Manual Instruction:**\n${manualPrompt}\n\n`;
  }

  if (aiSystemPrompt) {
    aggregatedBody += `${aiSystemPrompt}\n\n---\n\n`;
  } else {
    aggregatedBody += `Below are the most recent pull request comments and code reviews. Please use these exact comments as the context to fix the PR. Do not ask me for the text of the PR comments; they are provided right below this message.\n\n---\n\n`;
  }

  const rawJsonData: any[] = [];

  // Deduplication
  const deduplicatedComments: any[] = [];
  const normalize = (str: string) => str.trim().replace(/\s+/g, ' ').toLowerCase();

  const sanitize = (s: string | null | undefined) =>
    s == null ? s : s.replace(/-->/g, '--&gt;').replace(/JSON_END/g, 'JSON_END_SAFE').replace(/JSON_START/g, 'JSON_START_SAFE');

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
    let botName = comment.author;
    let botRole: string | null = null;
    if (botMappings) {
        const mapping = botMappings.find(m => m.botSource.toLowerCase() === botName.toLowerCase());
        if (mapping) {
            botName = mapping.agentName;
            botRole = sanitize(mapping.role) ?? null;
        }
    }

    rawJsonData.push({
      role: botRole,
      author: sanitize(botName),
      body: comment.body, // this gets sanitized properly lower down during map
      source: sanitize(comment.source),
      count: comment.count,
      actionTag: sanitize(comment.actionTag)
    });

    let displayBody = comment.body;

    // Diff extraction and highlighting
    if (displayBody.includes('```diff')) {
        // Find codeblocks and wrap them or add a note
        displayBody = displayBody.replace(/(```diff[\s\S]*?```)/g, '\n**⚠️ Suggested Code Changes:**\n$1\n');
    }

    const countLabel = comment.count > 1 ? `\n**[Reported ${comment.count}x]**` : '';

    const buildRoleInject = (role: string | null) =>
      role ? `\n**Persona / Role for Jules:** Please adopt the role of ${role} when addressing this specific issue.\n` : '';
    const buildActionInject = (tag: string | undefined) => {
      if (tag?.includes('SEC_REVIEW')) return `\n**[SECURITY REVIEW REQUIRED]** Please prioritize reviewing this security vulnerability.\n`;
      if (tag?.includes('FIX_ERROR')) return `\n**[ERROR FIX REQUIRED]** Please resolve this failing test or error.\n`;
      return '';
    };

    if (commentTemplate) {
      // Split and construct to avoid injecting variables within body content replacing themselves
      const roleInject = buildRoleInject(botRole);
      const actionInject = buildActionInject(comment.actionTag);
      const actionTagToAppend = actionInject ? '' : comment.actionTag;
      const parts = commentTemplate.split('{{body}}');
      if (parts.length > 1) {
          parts[0] = parts[0] + roleInject + actionInject;
          let pre = parts[0].replace(/\{\{bot_name\}\}/g, botName).replace(/\{\{action_tag\}\}/g, actionTagToAppend + countLabel);
          let post = parts[1].replace(/\{\{bot_name\}\}/g, botName).replace(/\{\{action_tag\}\}/g, actionTagToAppend + countLabel);
          aggregatedBody += `${pre}${displayBody}${post}\n\n---\n\n`;
      } else {
          let formattedComment = commentTemplate
            .replace(/\{\{bot_name\}\}/g, botName)
            .replace(/\{\{action_tag\}\}/g, actionTagToAppend + countLabel);
          formattedComment = roleInject + actionInject + formattedComment;
          aggregatedBody += `${formattedComment}\n\n${displayBody}\n\n---\n\n`;
      }

    } else {
      aggregatedBody += `#### From **@${botName}**`;
      aggregatedBody += buildRoleInject(botRole).replace(/\n$/, '');
      aggregatedBody += buildActionInject(comment.actionTag).replace(/^\n/, '\n').replace(/\n$/, '');
      if (comment.actionTag && !comment.actionTag.includes('SEC_REVIEW') && !comment.actionTag.includes('FIX_ERROR')) {
        aggregatedBody += `\n${comment.actionTag}`;
      }
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
