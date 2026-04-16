"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processFailsafeForwarding = processFailsafeForwarding;
var julesApi_1 = require("./src/lib/julesApi");
function processFailsafeForwarding(prisma, octokit, settings) {
    return __awaiter(this, void 0, void 0, function () {
        var repositories, now, _i, repositories_1, repo, batchDelayMs, forwardDelayMs, effectiveDelayMs, cutoffTime, pendingComments, prGroups, _a, _b, prNumberStr, prNumber, comments, pullRequest, sessionIdMatch, sessionId, aggregatedBody, _c, comments_1, c, e_1;
        var _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    if (!(settings === null || settings === void 0 ? void 0 : settings.julesApiKey))
                        return [2 /*return*/];
                    return [4 /*yield*/, prisma.repository.findMany({
                            where: { isActive: true, julesChatForwardMode: 'failsafe' }
                        })];
                case 1:
                    repositories = _e.sent();
                    now = new Date();
                    _i = 0, repositories_1 = repositories;
                    _e.label = 2;
                case 2:
                    if (!(_i < repositories_1.length)) return [3 /*break*/, 15];
                    repo = repositories_1[_i];
                    batchDelayMs = ((settings === null || settings === void 0 ? void 0 : settings.batchDelay) || 5) * 60 * 1000;
                    forwardDelayMs = repo.julesChatForwardDelay * 60 * 1000;
                    effectiveDelayMs = Math.max(forwardDelayMs, batchDelayMs);
                    cutoffTime = new Date(now.getTime() - effectiveDelayMs);
                    return [4 /*yield*/, prisma.processedComment.findMany({
                            where: {
                                repoOwner: repo.owner,
                                repoName: repo.name,
                                forwardedToJules: false,
                                processedAt: { lte: cutoffTime }
                            }
                        })];
                case 3:
                    pendingComments = _e.sent();
                    if (pendingComments.length === 0)
                        return [3 /*break*/, 14];
                    prGroups = pendingComments.reduce(function (acc, comment) {
                        if (!acc[comment.prNumber])
                            acc[comment.prNumber] = [];
                        acc[comment.prNumber].push(comment);
                        return acc;
                    }, {});
                    _a = 0, _b = Object.keys(prGroups);
                    _e.label = 4;
                case 4:
                    if (!(_a < _b.length)) return [3 /*break*/, 14];
                    prNumberStr = _b[_a];
                    prNumber = parseInt(prNumberStr, 10);
                    comments = prGroups[prNumber];
                    _e.label = 5;
                case 5:
                    _e.trys.push([5, 12, , 13]);
                    return [4 /*yield*/, octokit.rest.pulls.get({
                            owner: repo.owner,
                            repo: repo.name,
                            pull_number: prNumber
                        })];
                case 6:
                    pullRequest = (_e.sent()).data;
                    sessionIdMatch = (_d = pullRequest.body) === null || _d === void 0 ? void 0 : _d.match(/jules\.google\.com\/task\/(\d+)/);
                    if (!sessionIdMatch) return [3 /*break*/, 9];
                    sessionId = sessionIdMatch[1];
                    aggregatedBody = "### \uD83E\uDD16 Auto-Forwarded Failsafe Comments\n\n";
                    for (_c = 0, comments_1 = comments; _c < comments_1.length; _c++) {
                        c = comments_1[_c];
                        aggregatedBody += "#### From **@".concat(c.author, "**:\n").concat(c.body, "\n\n---\n\n");
                    }
                    console.log("Failsafe forwarding ".concat(comments.length, " comments to Jules PR #").concat(prNumber));
                    return [4 /*yield*/, (0, julesApi_1.sendMessage)(settings.julesApiKey, sessionId, aggregatedBody)];
                case 7:
                    _e.sent();
                    // Mark as forwarded
                    return [4 /*yield*/, prisma.processedComment.updateMany({
                            where: { id: { in: comments.map(function (c) { return c.id; }) } },
                            data: { forwardedToJules: true }
                        })];
                case 8:
                    // Mark as forwarded
                    _e.sent();
                    return [3 /*break*/, 11];
                case 9:
                // If there is no session ID, mark them as forwarded to prevent infinite retry
                return [4 /*yield*/, prisma.processedComment.updateMany({
                        where: { id: { in: comments.map(function (c) { return c.id; }) } },
                        data: { forwardedToJules: true }
                    })];
                case 10:
                    // If there is no session ID, mark them as forwarded to prevent infinite retry
                    _e.sent();
                    _e.label = 11;
                case 11: return [3 /*break*/, 13];
                case 12:
                    e_1 = _e.sent();
                    console.error("Failsafe forwarding failed for PR #".concat(prNumber, ":"), e_1);
                    return [3 /*break*/, 13];
                case 13:
                    _a++;
                    return [3 /*break*/, 4];
                case 14:
                    _i++;
                    return [3 /*break*/, 2];
                case 15: return [2 /*return*/];
            }
        });
    });
}
