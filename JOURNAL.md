# Project Journal

## Session: Automatic Pull Request Merging
**Date**: 2026-04-15

### Context
The user requested to start implementing the first item from the `docs/ROADMAP.md` which was: "Automatic Pull Request Merging".
The goal was to allow the bot to automatically merge PRs created by the user once certain conditions (CI checks, reviews) were met.
We also established that this journal file (`JOURNAL.md`) will serve as persistent memory across sessions to keep track of technical decisions and changes.

### Changes Made
1. **Database Update (Prisma)**
   - Expanded the `Repository` model in `prisma/schema.prisma` to include auto-merge configuration fields per repo:
     - `autoMergeEnabled` (Boolean)
     - `requiredApprovals` (Int)
     - `requireCI` (Boolean)
     - `mergeStrategy` (String: 'merge', 'squash', 'rebase')
   - Created a new `AutoMergeLog` model to track successes and failures of merge attempts.
   - Migrated the local SQLite database.

2. **Web UI & API**
   - Updated Next.js API routes (`/api/repositories` and `/api/repositories/[id]`) to accept and update the new repo configurations.
   - Created a new `/api/logs` endpoint to fetch the merge logs.
   - Updated `src/app/repositories/page.tsx` with a form to define these new settings when adding a repo, and added an inline-edit row to update existing tracked repositories.
   - Created `src/app/logs/page.tsx` to list out auto-merge events with success/fail status.
   - Updated the sidebar navigation in `src/app/layout.tsx` to include the Logs page.

3. **Background Worker**
   - Modified `worker.ts` to execute auto-merge validation before attempting to gather comments for aggregation.
   - **CI Checking**: Implemented checks against both Github Actions (`checks.listForRef`) and classic Commit Statuses (`repos.getCombinedStatusForRef`). If `requireCI` is enabled, any configured checks *must* be successful for the merge to proceed.
   - **Review Checking**: Gathered all reviews (`pulls.listReviews`) and ensured that the latest non-dismissed review per reviewer meets the `requiredApprovals` count, and verified there are no blocking `CHANGES_REQUESTED` statuses.
   - **Execution & Logging**: Invoked `octokit.rest.pulls.merge` utilizing the configured `mergeStrategy`. Wrote the output (Success or Failure) to the new `AutoMergeLog` database table.

### Notes for Future Sessions
- The auto-merge feature heavily relies on the PR being owned by the same user who provided the GitHub Token (`pr.user.login === currentUser.login`).
- `node-cron` and intervals are used for polling. Next steps on the roadmap involve Jules API integration.
- The `JOURNAL.md` should be appended to at the end of each future session.

## Session: Jules API Integration (Task Scheduling & Comment Forwarding)
**Date**: 2026-04-15

### Context
The user requested implementation of the second and third items from `docs/ROADMAP.md`:
2. "Jules API Integration (Task Scheduling)" - automatically starting a new Jules session after a PR is auto-merged.
3. "Forwarding GitHub Comments to Jules Chat with Delay" - mirroring aggregated bot comments to the Jules session if configured.

### Changes Made
1. **Database Schema (`prisma/schema.prisma`)**
   - Added `julesApiKey` to the `Settings` model.
   - Added `taskSourceType`, `taskSourcePath`, `julesPromptTemplate`, `julesChatForwardMode`, and `julesChatForwardDelay` to the `Repository` model.
   - Added `forwardedToJules` boolean field to the `ProcessedComment` model to track which comments have successfully reached Jules chat.
   - Executed a Prisma migration (`add_jules_fields`).
2. **Web UI & API**
   - Updated `/api/settings` and `/app/settings/page.tsx` to handle the `julesApiKey` input fields and save logic.
   - Updated `/api/repositories/*` and `/app/repositories/page.tsx` with UI controls for the new repository settings: task source type, prompt template, and forward modes (Always vs Failsafe).
3. **Jules API Client (`src/lib/julesApi.ts`)**
   - Built an HTTP client mapping the provided REST API documentation (v1alpha) supporting `createSession` and `sendMessage`.
4. **Worker Logic (`worker.ts` & `patch_failsafe.ts`)**
   - Implemented comment forwarding: extracting the `sessionId` via regex from PR descriptions (`jules.google.com/task/<id>`).
   - Added logic for both "always" (forward right after aggregation) and "failsafe" (delayed forwarding using a separate `processFailsafeForwarding` check).
   - Added task scheduling: pulling open issues from the GitHub API and creating a new Jules session upon successful PR merge.

### Notes for Future Sessions
- Task source type "local_folder" has placeholder logic for the actual filesystem reading since we depend on the user's explicit path which was outside the current requirements depth.
- The regex correctly targets `jules.google.com/task/(\d+)` to find the active session.
- `julesApiKey` must be configured in settings to trigger the new functionality.

## 2026-04-16: Added Repository Pull Request Tracking Page
- Discussed requirements for adding a dedicated PR page per repository to provide better visibility.
- Created `src/app/api/repositories/[id]/prs/route.ts` to live-fetch open PRs via the GitHub API and merge them with locally cached DB data (processed comments, batch status, recent auto-merge logs).
- Created `src/app/repositories/[id]/page.tsx` for the UI showing a table of all active PRs. Expanded the rows to show the specific bot comments and detailed logs fetched for each PR.
- Updated the main `src/app/repositories/page.tsx` dashboard table to include an 'Eye' icon button linking to the respective new PR overview page.
## Session: AI Agent Output Optimization (IDEAS Category A)
**Date**: 2026-04-16

### Context
The user requested implementation of all 5 items from Category A in `IDEAS.md`. The goal was to optimize the aggregated GitHub PR comments so that listening AI agents can easily parse the data, understand the context, and take immediate action.

### Changes Made
1. **JSON-Injection (Idea A1 & A5)**: Added logic in `worker.ts` to collect all raw bot comments into an array, map the `author`, `body`, and `source`, and serialize them into a JSON string embedded inside a hidden `<!-- JSON_START ... JSON_END -->` block at the end of the aggregated PR comment.
2. **AI System Prompt Header (Idea A2)**: Added an `aiSystemPrompt` field to the `Repository` model in Prisma. This allows the user to define a top-level prompt (e.g., "@ai-agent, fix this") that will be prefixed to every aggregated comment for that specific repository.
3. **Action-Tags per Bot Error (Idea A3)**: Implemented rudimentary keyword detection inside the worker (`worker.ts`). Based on words like "error", "warn", or "security" in the bot comments, it automatically infers tags like `[ACTION: FIX_ERROR]`, `[ACTION: REVIEW]`, or `[ACTION: SEC_REVIEW]`.
4. **Dynamic Template Builder (Idea A4)**: Added a `commentTemplate` field to the `Repository` model. Through the Web UI, users can now provide a Markdown template utilizing variables like `{{bot_name}}`, `{{body}}`, and `{{action_tag}}`. If provided, the worker applies this template instead of the default layout.
5. **Database & UI Synchronization**: Updated the `prisma/schema.prisma`, ran the migrations, and fully implemented the new fields in `src/app/api/repositories/route.ts`, `src/app/api/repositories/[id]/route.ts`, and the frontend interface (`src/app/repositories/page.tsx`).

### Notes for Future Sessions
- The action-tag generator uses simple `toLowerCase().includes()` keyword matching. For more precision in the future, we could explore regex or specific target-bot mapping configurations.
- The `.env` generation was slightly flaky during the `prisma migrate dev` command due to missing `DATABASE_URL` during runtime in CLI versus `next.config`. Temporarily injected `file:./dev.db` to accomplish the schema synchronization.

## 2026-04-17: Implement Category B - Advanced Filtering & Deduplication
* **Schema Updates:** Added `noActionRegex` field to the `TargetReviewer` database model.
* **UI & API:** Updated the Reviewers settings page and API endpoints to allow setting and editing the `noActionRegex`.
* **No Action Needed Filtering:** Implemented filtering in the background worker. If a comment body matches the author's configured regex, the comment is fully ignored and not persisted.
* **Strikte Inhoudelijke Deduplicatie:** Added deduplication logic in `formatAggregatedBody` that detects duplicate comments from the same author, combining them into one point marked with `[Reported X times]`.
* **Prioritering en Sortering van Feedback:** Formatter now sorts feedback items based on severity tags (`[ACTION: SEC_REVIEW]` > `[ACTION: FIX_ERROR]` > `[ACTION: REVIEW]`).
* **Diff Extractie:** Formatter specifically identifies ` ```diff ` (or ` ``` `) blocks and visually enhances them with a "Suggested Code Changes:" warning header.
* **Minimize Original Comments:** After the worker posts the aggregated comment, it loops over all source comments, fetches their `node_id`, and utilizes the GitHub GraphQL API to minimize the original comments using the `RESOLVED` classifier, maintaining a clean PR chat timeline.
* The Next.js production build and TypeScript compilation completed successfully.

## 2026-04-17 19:46 - Adding option to disable aggregated comments
- **Task:** Allow disabling of PR commenting while ensuring Jules forwarding still works.
- **Changes:**
  - Added `postAggregatedComments` boolean field to the Prisma `Repository` schema.
  - Updated API routes (`src/app/api/repositories/route.ts` and `src/app/api/repositories/[id]/route.ts`) to handle the new field.
  - Updated the frontend UI (`src/app/repositories/page.tsx`) to show a checkbox "Post PR Comment" in the create and edit modal.
  - Adjusted the background worker (`worker.ts`) to skip `octokit.rest.issues.createComment` and skip minimizing comments (by setting `minimizableComments = []`) if `postAggregatedComments` is false, but still forward to Jules.
- **Status:** Completed.

## Session 2026-04-18 14:35

Implemented Category D ideas from `IDEAS.md`:
- **Dynamic Batch Delays:** Added `batchDelay` to the Repository schema to allow a custom delay per repository, falling back to the global setting.
- **Branch Whitelisting/Blacklisting:** Added `branchWhitelist` and `branchBlacklist` fields. The worker now checks the target branch of the PR before processing.
- **Multi-Account Support:** Added a `githubToken` field per repository so that a specific PAT can be used instead of the global one.
- **Smart Wait (Required Bots):** Instead of updating existing comments (Idea 20), implemented a new feature where the user can specify a comma-separated list of bots in `requiredBots`. The worker will delay processing until all required bots have commented, up to a maximum wait time of 30 minutes.

All UI forms and API endpoints were updated accordingly, and the `worker.ts` polling logic now fetches this configuration directly inside its loop.

## 2026-04-18 - Added System Update Button

Added a button on the settings page to perform a self-update.

### Changes Made:
- Created an API endpoint at `/api/system/update` to perform a `git fetch origin main`, `git reset --hard origin/main`, `npm install`, `npx prisma migrate deploy`, `npm run build`, and `pm2 restart ecosystem.config.js`.
- Added a "System Update" button to the `SettingsPage` that calls the new update endpoint. Included a warning message about the hard reset.

### Decisions:
- Due to the nature of self-updating processes on Node, the application relies on an asynchronous child process using PM2 to perform the restart. This is simpler to implement but makes it hard to guarantee a response on completion. Therefore, the UI just shows an "Update Started..." state.
- Proceeded with a `git reset --hard` to minimize conflicts when pulling the latest changes.

## 2024-04-18 - Implemented Category E Ideas (DevOps)
* **Prisma Schema Update:** Added `webhookSecret`, `retentionDays`, `rateLimitRemaining`, and `rateLimitReset` to the Settings model, and added the new `WebhookSignal` model to handle Github webhooks event queues.
* **Winston Centralized Logging:** Integrated Winston for standard rotating daily logging in the `logs/` directory. Substituted existing `console.log` and `console.error` calls across worker.ts and the UI API routes.
* **Auto-Pruning of the Database:** Added a mechanism in `worker.ts` that removes `ProcessedComment` records older than the user-configured retention limit (defaulting to 60 days). Added this retention limit configuration in the `Settings` UI.
* **GitHub Webhooks / Event-driven Support:** Created `/api/webhooks/github` that stores signals for updated pull request states securely in the local database. `worker.ts` automatically runs every 5 seconds checking for new signals, instantly executing the aggregator, circumventing long batch delays for simple webhook processing while keeping scheduled tasks as fallback mechanisms. Added secure HMAC-SHA256 signature validation.
* **GitHub Rate-Limiting Protection:** Developed a `hook.after('request', ...)` inside `worker.ts` using Octokit to track limit caps headers directly from Github API's `x-ratelimit-remaining` and `x-ratelimit-reset`. Displays warning banners securely in the Dashboard.
* **Docker Support:** Authored `Dockerfile` and `docker-compose.yml`, using a SQLite docker volume mapping. Included instructions via shell startup script for both Next.js UI web apps and Worker apps using a simple `ROLE=web|worker` environment variable.
