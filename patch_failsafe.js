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
var octokit_1 = require("octokit");
var julesApi_1 = require("./src/lib/julesApi");
var format_helper_1 = require("./src/lib/format_helper");
var prisma_1 = require("./src/lib/prisma");
function processFailsafeForwarding() {
    return __awaiter(this, void 0, void 0, function () {
        var settings, octokit, repos, _i, repos_1, repo, cutoffTime, pendingComments, prGroups, _a, _b, _c, prNumberStr, comments, prNumber, pullRequest, sessionIdMatch, sessionId, aggregatedBody, e_1;
        var _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4 /*yield*/, prisma_1.prisma.settings.findUnique({ where: { id: 1 } })];
                case 1:
                    settings = _e.sent();
                    if (!(settings === null || settings === void 0 ? void 0 : settings.julesApiKey))
                        return [2 /*return*/];
                    octokit = new octokit_1.Octokit({ auth: settings.githubToken });
                    return [4 /*yield*/, prisma_1.prisma.repository.findMany({
                            where: { isActive: true, julesChatForwardMode: 'failsafe' }
                        })];
                case 2:
                    repos = _e.sent();
                    _i = 0, repos_1 = repos;
                    _e.label = 3;
                case 3:
                    if (!(_i < repos_1.length)) return [3 /*break*/, 16];
                    repo = repos_1[_i];
                    if (!repo.julesChatForwardDelay)
                        return [3 /*break*/, 15];
                    cutoffTime = new Date(Date.now() - repo.julesChatForwardDelay * 60 * 1000);
                    return [4 /*yield*/, prisma_1.prisma.processedComment.findMany({
                            where: {
                                repoOwner: repo.owner,
                                repoName: repo.name,
                                postedAt: { lte: cutoffTime },
                                forwardedToJules: false
                            },
                            orderBy: { postedAt: 'asc' }
                        })];
                case 4:
                    pendingComments = _e.sent();
                    if (pendingComments.length === 0)
                        return [3 /*break*/, 15];
                    prGroups = pendingComments.reduce(function (acc, comment) {
                        if (!acc[comment.prNumber])
                            acc[comment.prNumber] = [];
                        acc[comment.prNumber].push(comment);
                        return acc;
                    }, {});
                    _a = 0, _b = Object.entries(prGroups);
                    _e.label = 5;
                case 5:
                    if (!(_a < _b.length)) return [3 /*break*/, 15];
                    _c = _b[_a], prNumberStr = _c[0], comments = _c[1];
                    prNumber = parseInt(prNumberStr, 10);
                    _e.label = 6;
                case 6:
                    _e.trys.push([6, 13, , 14]);
                    return [4 /*yield*/, octokit.rest.pulls.get({
                            owner: repo.owner,
                            repo: repo.name,
                            pull_number: prNumber
                        })];
                case 7:
                    pullRequest = (_e.sent()).data;
                    sessionIdMatch = (_d = pullRequest.body) === null || _d === void 0 ? void 0 : _d.match(/jules\.google\.com\/task\/(\d+)/);
                    if (!sessionIdMatch) return [3 /*break*/, 10];
                    sessionId = sessionIdMatch[1];
                    aggregatedBody = (0, format_helper_1.formatAggregatedBody)(comments, repo.aiSystemPrompt, repo.commentTemplate);
                    return [4 /*yield*/, (0, julesApi_1.sendMessage)(settings.julesApiKey, sessionId, aggregatedBody)];
                case 8:
                    _e.sent();
                    return [4 /*yield*/, prisma_1.prisma.processedComment.updateMany({
                            where: { id: { in: comments.map(function (c) { return c.id; }) } },
                            data: { forwardedToJules: true }
                        })];
                case 9:
                    _e.sent();
                    console.log("[Failsafe] Forwarded ".concat(comments.length, " delayed comments to Jules session ").concat(sessionId, " for PR #").concat(prNumber));
                    return [3 /*break*/, 12];
                case 10:
                // If no session ID found, mark them as forwarded anyway to avoid infinite retries
                return [4 /*yield*/, prisma_1.prisma.processedComment.updateMany({
                        where: { id: { in: comments.map(function (c) { return c.id; }) } },
                        data: { forwardedToJules: true }
                    })];
                case 11:
                    // If no session ID found, mark them as forwarded anyway to avoid infinite retries
                    _e.sent();
                    console.log("[Failsafe] Marked ".concat(comments.length, " comments as forwarded (No Jules Session in PR #").concat(prNumber, ")"));
                    _e.label = 12;
                case 12: return [3 /*break*/, 14];
                case 13:
                    e_1 = _e.sent();
                    console.error("[Failsafe] Failed to forward comments for PR #".concat(prNumber, ":"), e_1);
                    return [3 /*break*/, 14];
                case 14:
                    _a++;
                    return [3 /*break*/, 5];
                case 15:
                    _i++;
                    return [3 /*break*/, 3];
                case 16: return [2 /*return*/];
            }
        });
    });
}
