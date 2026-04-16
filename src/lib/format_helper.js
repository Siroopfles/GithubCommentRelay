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
    for (var _i = 0, commentsToBatch_1 = commentsToBatch; _i < commentsToBatch_1.length; _i++) {
        var comment = commentsToBatch_1[_i];
        rawJsonData.push({
            author: comment.author,
            body: comment.body,
            source: comment.source
        });
        var lowerBody = comment.body.toLowerCase();
        var actionTag = '';
        // Ordered priority: Security > Fix Error > Review
        if (lowerBody.includes('security') || lowerBody.includes('vulnerability')) {
            actionTag = '[ACTION: SEC_REVIEW] ';
        }
        else if (lowerBody.includes('error') || lowerBody.includes('failed') || lowerBody.includes('critical')) {
            actionTag = '[ACTION: FIX_ERROR] ';
        }
        else if (lowerBody.includes('warn') || lowerBody.includes('suggestion') || lowerBody.includes('review')) {
            actionTag = '[ACTION: REVIEW] ';
        }
        if (commentTemplate) {
            // Split and construct to avoid injecting variables within body content replacing themselves
            var parts = commentTemplate.split('{{body}}');
            if (parts.length > 1) {
                var pre = parts[0].replace(/\{\{bot_name\}\}/g, comment.author).replace(/\{\{action_tag\}\}/g, actionTag);
                var post = parts[1].replace(/\{\{bot_name\}\}/g, comment.author).replace(/\{\{action_tag\}\}/g, actionTag);
                aggregatedBody += "".concat(pre).concat(comment.body).concat(post, "\n\n---\n\n");
            }
            else {
                var formattedComment = commentTemplate
                    .replace(/\{\{bot_name\}\}/g, comment.author)
                    .replace(/\{\{action_tag\}\}/g, actionTag);
                aggregatedBody += "".concat(formattedComment, "\n\n---\n\n");
            }
        }
        else {
            aggregatedBody += "#### From **@".concat(comment.author, "** ").concat(actionTag ? "\n".concat(actionTag) : '', "\n");
            aggregatedBody += "".concat(comment.body, "\n\n---\n\n");
        }
    }
    // Sanitize comment.body before serialization inside rawJsonData
    var sanitizedJsonData = rawJsonData.map(function (item) { return (__assign(__assign({}, item), { body: item.body.replace(/-->/g, '--&gt;').replace(/JSON_END/g, 'JSON_END_SAFE').replace(/JSON_START/g, 'JSON_START_SAFE') })); });
    var jsonString = JSON.stringify(sanitizedJsonData, null, 2);
    aggregatedBody += "\n<!-- JSON_START\n".concat(jsonString, "\nJSON_END -->\n");
    return aggregatedBody;
}
