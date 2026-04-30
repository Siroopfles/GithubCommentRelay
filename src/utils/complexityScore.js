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
exports.defaultWeights = void 0;
exports.calculateComplexity = calculateComplexity;
exports.defaultWeights = {
    linting: 1,
    typeError: 3,
    security: 8,
    testFailure: 5,
    general: 0.1,
    unknown: 2,
    stacktraceLinePenalty: 0.5,
    maxStacktracePenalty: 5,
    fileCountPenalty: 1,
    maxFileCountPenalty: 10,
    maxBaseCategoryPenalty: 15,
    maxKeywordPenalty: 15,
    keywords: {
        "syntaxerror": 1,
        "type mismatch": 2,
        "memory leak": 10,
        "not found": 0.5,
        "undefined": 0.5,
        "null pointer": 4,
        "segmentation fault": 10,
        "timeout": 3,
        "dependency": 4
    }
};
function calculateComplexity(comments, customWeightsJson) {
    var weights = __assign(__assign({}, exports.defaultWeights), { keywords: __assign({}, exports.defaultWeights.keywords) });
    if (customWeightsJson) {
        try {
            var custom = JSON.parse(customWeightsJson);
            if (custom && typeof custom === 'object' && !Array.isArray(custom)) {
                // Deep validate numeric fields
                for (var _i = 0, _a = Object.keys(exports.defaultWeights); _i < _a.length; _i++) {
                    var key = _a[_i];
                    if (key !== 'keywords' && custom[key] !== undefined) {
                        if (typeof custom[key] === 'number' && Number.isFinite(custom[key])) {
                            weights[key] = custom[key];
                        }
                        else {
                            console.warn("complexityWeights field '".concat(key, "' is not a finite number, using default."));
                        }
                    }
                }
                if (custom.replaceKeywords === true) {
                    weights.keywords = {};
                }
                if (custom.keywords && typeof custom.keywords === 'object' && !Array.isArray(custom.keywords)) {
                    for (var _b = 0, _c = Object.entries(custom.keywords); _b < _c.length; _b++) {
                        var _d = _c[_b], kw = _d[0], val = _d[1];
                        if (val === null) {
                            delete weights.keywords[kw];
                        }
                        else if (typeof val === 'number' && Number.isFinite(val) && val >= 0) {
                            weights.keywords[kw] = val;
                        }
                        else {
                            console.warn("complexityWeights.keywords field '".concat(kw, "' is not a finite number, using default if it exists."));
                        }
                    }
                }
                else if (custom.keywords !== undefined && custom.keywords !== null) {
                    console.warn("complexityWeights.keywords must be an object, using defaults.");
                }
            }
            else {
                console.warn("complexityWeights JSON must be an object, falling back to default");
            }
        }
        catch (e) {
            console.warn("Invalid complexityWeights JSON, falling back to default", e);
        }
    }
    var totalScore = 0;
    var breakdown = { baseCategoryScore: 0, stacktraceScore: 0, fileCountScore: 0, keywordScore: 0 };
    var uniqueFiles = new Set();
    for (var _e = 0, comments_1 = comments; _e < comments_1.length; _e++) {
        var comment = comments_1[_e];
        // 1. Base category score
        switch (comment.category) {
            case "lint":
                breakdown.baseCategoryScore += weights.linting;
                break;
            case "type_error":
                breakdown.baseCategoryScore += weights.typeError;
                break;
            case "security":
                breakdown.baseCategoryScore += weights.security;
                break;
            case "test_failure":
                breakdown.baseCategoryScore += weights.testFailure;
                break;
            case "general":
                breakdown.baseCategoryScore += weights.general;
                break;
            default:
                breakdown.baseCategoryScore += weights.unknown;
                break;
        }
        // 2. Stacktrace length — count only stack-frame-like lines
        var stackLines = comment.body.split('\n').filter(function (l) {
            return /^\s*at\s+\S+/.test(l) || /^\s*File\s+".+",\s*line\s+\d+/.test(l);
        }).length;
        breakdown.stacktraceScore += stackLines * weights.stacktraceLinePenalty;
        // 3. Keywords
        var bodyLines = comment.body.split('\n');
        var kwScoreForComment = 0;
        for (var _f = 0, bodyLines_1 = bodyLines; _f < bodyLines_1.length; _f++) {
            var line = bodyLines_1[_f];
            var lowerLine = line.toLowerCase();
            // Only match keywords on lines that look like errors/exceptions
            if (lowerLine.includes('error') || lowerLine.includes('exception') || lowerLine.includes('traceback') || lowerLine.includes('warning') || lowerLine.includes('fail')) {
                for (var _g = 0, _h = Object.entries(weights.keywords); _g < _h.length; _g++) {
                    var _j = _h[_g], kw = _j[0], score = _j[1];
                    if (lowerLine.includes(kw.toLowerCase())) {
                        kwScoreForComment += score;
                    }
                }
            }
        }
        breakdown.keywordScore += kwScoreForComment;
        // Simple file detection heuristic (e.g., path/to/file.ts)
        // Require either a directory separator or a known source-file extension
        var fileMatches = comment.body.match(/\b[a-zA-Z0-9_\-./]*\/[a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]{1,6}\b|\b[a-zA-Z0-9_\-.]+\.(?:ts|tsx|js|jsx|py|go|rs|java|rb|php|cs|cpp|c|h|hpp|md|json|yml|yaml|sql|sh)\b/g);
        if (fileMatches) {
            fileMatches.forEach(function (f) { return uniqueFiles.add(f); });
        }
    }
    // Cap base category score
    if (breakdown.baseCategoryScore > weights.maxBaseCategoryPenalty) {
        breakdown.baseCategoryScore = weights.maxBaseCategoryPenalty;
    }
    totalScore += breakdown.baseCategoryScore;
    // Cap keyword score
    if (breakdown.keywordScore > weights.maxKeywordPenalty) {
        breakdown.keywordScore = weights.maxKeywordPenalty;
    }
    totalScore += breakdown.keywordScore;
    // Cap stacktrace score in aggregate (consistent with keyword/file caps)
    if (breakdown.stacktraceScore > weights.maxStacktracePenalty) {
        breakdown.stacktraceScore = weights.maxStacktracePenalty;
    }
    totalScore += breakdown.stacktraceScore;
    // 4. File count penalty
    var filePenalty = uniqueFiles.size * weights.fileCountPenalty;
    if (filePenalty > weights.maxFileCountPenalty)
        filePenalty = weights.maxFileCountPenalty;
    breakdown.fileCountScore = filePenalty;
    totalScore += filePenalty;
    var label = "EASY";
    if (totalScore >= 20)
        label = "CRITICAL";
    else if (totalScore >= 10)
        label = "HARD";
    else if (totalScore >= 5)
        label = "MEDIUM";
    return { score: Math.round(totalScore * 10) / 10, label: label, breakdown: breakdown };
}
