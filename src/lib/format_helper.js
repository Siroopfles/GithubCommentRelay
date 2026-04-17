"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatAggregatedBody = formatAggregatedBody;
function formatAggregatedBody(commentsToBatch, aiSystemPrompt, commentTemplate) {
    var aggregatedBody = "### \uD83E\uDD16 Automated Reviewer Comments Aggregated\n\n";
    if (aiSystemPrompt) {
        aggregatedBody += "".concat(aiSystemPrompt, "\n\n---\n\n");
    }
    var rawJsonData = [];
    // Deduplication
    var deduplicatedComments = [];
    var _loop_1 = function (comment) {
        // Simple deduplication based on exact body match or highly similar body
        var existing = deduplicatedComments.find(function (c) {
            return c.author === comment.author &&
                (c.body === comment.body || c.body.includes(comment.body) || comment.body.includes(c.body));
        });
        if (existing) {
            existing.count = (existing.count || 1) + 1;
            // If the new comment has more context (is longer), use it instead
            if (comment.body.length > existing.body.length) {
                existing.body = comment.body;
            }
        }
        else {
            deduplicatedComments.push(__assign(__assign({}, comment), { count: 1 }));
        }
    };
    for (var _i = 0, commentsToBatch_1 = commentsToBatch; _i < commentsToBatch_1.length; _i++) {
        var comment = commentsToBatch_1[_i];
        _loop_1(comment);
    }
    // Assign action tags and sort priority
    var commentsWithTags = deduplicatedComments.map(function (comment) {
        var lowerBody = comment.body.toLowerCase();
        var actionTag = '';
        var priority = 3;
        // Ordered priority: Security > Fix Error > Review
        if (lowerBody.includes('security') || lowerBody.includes('vulnerability')) {
            actionTag = '[ACTION: SEC_REVIEW]';
            priority = 1;
        }
        else if (lowerBody.includes('error') || lowerBody.includes('failed') || lowerBody.includes('critical')) {
            actionTag = '[ACTION: FIX_ERROR]';
            priority = 2;
        }
        else if (lowerBody.includes('warn') || lowerBody.includes('suggestion') || lowerBody.includes('review')) {
            actionTag = '[ACTION: REVIEW]';
            priority = 3;
        }
        return __assign(__assign({}, comment), { actionTag: actionTag, priority: priority });
    });
    // Sort by priority (ascending: 1 is highest)
    commentsWithTags.sort(function (a, b) { return a.priority - b.priority; });
    // Process sorted and deduplicated comments
    for (var _a = 0, commentsWithTags_1 = commentsWithTags; _a < commentsWithTags_1.length; _a++) {
        var comment = commentsWithTags_1[_a];
        rawJsonData.push({
            author: comment.author,
            body: comment.body,
            source: comment.source,
            count: comment.count
        });
        var displayBody = comment.body;
        // Diff extraction and highlighting
        if (displayBody.includes('```diff') || displayBody.includes('```')) {
            // Find codeblocks and wrap them or add a note
            displayBody = displayBody.replace(/(```[\s\S]*?```)/g, '\n**⚠️ Suggested Code Changes:**\n$1\n');
        }
        var countLabel = comment.count > 1 ? " **[Reported ".concat(comment.count, "x]** ") : '';
        if (commentTemplate) {
            // Split and construct to avoid injecting variables within body content replacing themselves
            var parts = commentTemplate.split('{{body}}');
            if (parts.length > 1) {
                var pre = parts[0].replace(/\{\{bot_name\}\}/g, comment.author).replace(/\{\{action_tag\}\}/g, comment.actionTag + countLabel);
                var post = parts[1].replace(/\{\{bot_name\}\}/g, comment.author).replace(/\{\{action_tag\}\}/g, comment.actionTag + countLabel);
                aggregatedBody += "".concat(pre).concat(displayBody).concat(post, "\n\n---\n\n");
            }
            else {
                var formattedComment = commentTemplate
                    .replace(/\{\{bot_name\}\}/g, comment.author)
                    .replace(/\{\{action_tag\}\}/g, comment.actionTag + countLabel);
                aggregatedBody += "".concat(formattedComment, "\n\n---\n\n");
            }
        }
        else {
            aggregatedBody += "#### From **@".concat(comment.author, "** ").concat(comment.actionTag ? "\n".concat(comment.actionTag) : '').concat(countLabel, "\n");
            aggregatedBody += "".concat(displayBody, "\n\n---\n\n");
        }
    }
    // Sanitize comment.body before serialization inside rawJsonData
    var sanitizedJsonData = rawJsonData.map(function (item) { return (__assign(__assign({}, item), { body: item.body.replace(/-->/g, '--&gt;').replace(/JSON_END/g, 'JSON_END_SAFE').replace(/JSON_START/g, 'JSON_START_SAFE') })); });
    var jsonString = JSON.stringify(sanitizedJsonData, null, 2);
    aggregatedBody += "\n<!-- JSON_START\n".concat(jsonString, "\nJSON_END -->\n");
    return aggregatedBody;
}
