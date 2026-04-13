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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var octokit_1 = require("octokit");
// @ts-ignore
var node_cron_1 = __importDefault(require("node-cron"));
var prisma = new client_1.PrismaClient();
function getOctokit() {
    return __awaiter(this, void 0, void 0, function () {
        var settings;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma.settings.findFirst()];
                case 1:
                    settings = _a.sent();
                    if (!(settings === null || settings === void 0 ? void 0 : settings.githubToken)) {
                        throw new Error('GitHub token not configured');
                    }
                    return [2 /*return*/, new octokit_1.Octokit({ auth: settings.githubToken })];
            }
        });
    });
}
function processRepositories() {
    return __awaiter(this, void 0, void 0, function () {
        var settings, repos, reviewers, reviewerUsernames, octokit, currentUser, _i, repos_1, repo, prs, _a, prs_1, pr, comments, _b, comments_1, comment, exists, batchDelayMs, now, pendingSessions, _c, pendingSessions_1, session, timeSinceFirstSeen, commentsToBatch, aggregatedBody, _d, commentsToBatch_1, comment, error_1;
        var _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    console.log("[".concat(new Date().toISOString(), "] Starting polling cycle..."));
                    _f.label = 1;
                case 1:
                    _f.trys.push([1, 27, , 28]);
                    return [4 /*yield*/, prisma.settings.findFirst()];
                case 2:
                    settings = _f.sent();
                    if (!(settings === null || settings === void 0 ? void 0 : settings.githubToken)) {
                        console.log('Skipping cycle: GitHub Token not configured.');
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, prisma.repository.findMany({ where: { isActive: true } })];
                case 3:
                    repos = _f.sent();
                    return [4 /*yield*/, prisma.targetReviewer.findMany({ where: { isActive: true } })];
                case 4:
                    reviewers = _f.sent();
                    if (repos.length === 0 || reviewers.length === 0) {
                        console.log('Skipping cycle: No active repositories or reviewers configured.');
                        return [2 /*return*/];
                    }
                    reviewerUsernames = reviewers.map(function (r) { return r.username.toLowerCase(); });
                    return [4 /*yield*/, getOctokit()
                        // Fetch currently authenticated user
                    ];
                case 5:
                    octokit = _f.sent();
                    return [4 /*yield*/, octokit.rest.users.getAuthenticated()];
                case 6:
                    currentUser = (_f.sent()).data;
                    _i = 0, repos_1 = repos;
                    _f.label = 7;
                case 7:
                    if (!(_i < repos_1.length)) return [3 /*break*/, 18];
                    repo = repos_1[_i];
                    console.log("Checking ".concat(repo.owner, "/").concat(repo.name, "..."));
                    return [4 /*yield*/, octokit.rest.pulls.list({
                            owner: repo.owner,
                            repo: repo.name,
                            state: 'open',
                            sort: 'updated',
                            direction: 'desc',
                            per_page: 20
                        })];
                case 8:
                    prs = (_f.sent()).data;
                    _a = 0, prs_1 = prs;
                    _f.label = 9;
                case 9:
                    if (!(_a < prs_1.length)) return [3 /*break*/, 17];
                    pr = prs_1[_a];
                    // Skip PRs not opened by the authenticated user
                    if (((_e = pr.user) === null || _e === void 0 ? void 0 : _e.login) !== currentUser.login)
                        return [3 /*break*/, 16];
                    return [4 /*yield*/, octokit.rest.issues.listComments({
                            owner: repo.owner,
                            repo: repo.name,
                            issue_number: pr.number,
                            per_page: 100
                        })];
                case 10:
                    comments = (_f.sent()).data;
                    _b = 0, comments_1 = comments;
                    _f.label = 11;
                case 11:
                    if (!(_b < comments_1.length)) return [3 /*break*/, 16];
                    comment = comments_1[_b];
                    if (!comment.user || !comment.body)
                        return [3 /*break*/, 15];
                    if (!reviewerUsernames.includes(comment.user.login.toLowerCase())) return [3 /*break*/, 15];
                    return [4 /*yield*/, prisma.processedComment.findUnique({
                            where: { commentId: comment.id }
                        })];
                case 12:
                    exists = _f.sent();
                    if (!!exists) return [3 /*break*/, 15];
                    console.log("Found new comment from ".concat(comment.user.login, " on PR #").concat(pr.number));
                    // Register new comment
                    return [4 /*yield*/, prisma.processedComment.create({
                            data: {
                                commentId: comment.id,
                                prNumber: pr.number,
                                repoOwner: repo.owner,
                                repoName: repo.name,
                                author: comment.user.login,
                                body: comment.body,
                                postedAt: new Date(comment.created_at)
                            }
                        })
                        // Create or update batch session
                    ];
                case 13:
                    // Register new comment
                    _f.sent();
                    // Create or update batch session
                    return [4 /*yield*/, prisma.batchSession.upsert({
                            where: {
                                prNumber_repoOwner_repoName_isProcessed: {
                                    prNumber: pr.number,
                                    repoOwner: repo.owner,
                                    repoName: repo.name,
                                    isProcessed: false
                                }
                            },
                            update: {}, // Keep existing firstSeenAt
                            create: {
                                prNumber: pr.number,
                                repoOwner: repo.owner,
                                repoName: repo.name,
                                firstSeenAt: new Date()
                            }
                        })];
                case 14:
                    // Create or update batch session
                    _f.sent();
                    _f.label = 15;
                case 15:
                    _b++;
                    return [3 /*break*/, 11];
                case 16:
                    _a++;
                    return [3 /*break*/, 9];
                case 17:
                    _i++;
                    return [3 /*break*/, 7];
                case 18:
                    batchDelayMs = (settings.batchDelay || 5) * 60 * 1000;
                    now = new Date().getTime();
                    return [4 /*yield*/, prisma.batchSession.findMany({
                            where: { isProcessed: false }
                        })];
                case 19:
                    pendingSessions = _f.sent();
                    _c = 0, pendingSessions_1 = pendingSessions;
                    _f.label = 20;
                case 20:
                    if (!(_c < pendingSessions_1.length)) return [3 /*break*/, 26];
                    session = pendingSessions_1[_c];
                    timeSinceFirstSeen = now - new Date(session.firstSeenAt).getTime();
                    if (!(timeSinceFirstSeen >= batchDelayMs)) return [3 /*break*/, 25];
                    console.log("Processing batch for PR #".concat(session.prNumber, " in ").concat(session.repoOwner, "/").concat(session.repoName, "..."));
                    return [4 /*yield*/, prisma.processedComment.findMany({
                            where: {
                                prNumber: session.prNumber,
                                repoOwner: session.repoOwner,
                                repoName: session.repoName,
                                // Only grab comments that were posted since the session started (roughly)
                                postedAt: { gte: session.firstSeenAt }
                            },
                            orderBy: { postedAt: 'asc' }
                        })];
                case 21:
                    commentsToBatch = _f.sent();
                    if (!(commentsToBatch.length > 0)) return [3 /*break*/, 23];
                    aggregatedBody = "### \uD83E\uDD16 Automated Reviewer Comments Aggregated\n\n";
                    for (_d = 0, commentsToBatch_1 = commentsToBatch; _d < commentsToBatch_1.length; _d++) {
                        comment = commentsToBatch_1[_d];
                        aggregatedBody += "#### From **@".concat(comment.author, "**:\n");
                        aggregatedBody += "".concat(comment.body, "\n\n---\n\n");
                    }
                    // Post to GitHub
                    return [4 /*yield*/, octokit.rest.issues.createComment({
                            owner: session.repoOwner,
                            repo: session.repoName,
                            issue_number: session.prNumber,
                            body: aggregatedBody
                        })];
                case 22:
                    // Post to GitHub
                    _f.sent();
                    console.log("Successfully posted aggregated comment to PR #".concat(session.prNumber));
                    _f.label = 23;
                case 23:
                // Mark session as processed
                return [4 /*yield*/, prisma.batchSession.update({
                        where: { id: session.id },
                        data: { isProcessed: true }
                    })];
                case 24:
                    // Mark session as processed
                    _f.sent();
                    _f.label = 25;
                case 25:
                    _c++;
                    return [3 /*break*/, 20];
                case 26: return [3 /*break*/, 28];
                case 27:
                    error_1 = _f.sent();
                    console.error('Error during polling cycle:', error_1);
                    return [3 /*break*/, 28];
                case 28: return [2 /*return*/];
            }
        });
    });
}
function start() {
    return __awaiter(this, void 0, void 0, function () {
        var settings, interval, cronExpression;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma.settings.findFirst()];
                case 1:
                    settings = _a.sent();
                    interval = (settings === null || settings === void 0 ? void 0 : settings.pollingInterval) || 60;
                    cronExpression = "*/".concat(interval, " * * * * *");
                    console.log("Starting worker with polling interval: ".concat(interval, "s"));
                    node_cron_1.default.schedule(cronExpression, function () {
                        void processRepositories();
                    });
                    return [2 /*return*/];
            }
        });
    });
}
void start();
