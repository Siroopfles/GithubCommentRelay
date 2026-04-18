# GitHub PR Comment Aggregator - Developer Journal

This journal tracks development sessions, decisions made, and significant changes.

## 2026-04-15: Initial Setup and Web UI Implementation
- Created the foundational Next.js project with Tailwind CSS.
- Defined the Prisma schema for `Settings`, `Repository`, `TargetReviewer`, `ProcessedComment`, and `BatchSession`.
- Implemented the UI and API for the Dashboard, Repositories management, Reviewers management, and Settings.
- Chose `lucide-react` for simple, consistent iconography.
- Set up the SQLite database and Prisma client.

## 2026-04-15: Background Worker Development
- Wrote `worker.ts` to run as a separate Node.js process using `node-cron`.
- Implemented the core polling logic: fetching tracked repos, checking open PRs from the authenticated user, fetching comments from tracked reviewers.
- Handled the batch delay logic: registering new comments in `ProcessedComment` and managing the state in `BatchSession`.
- Added logic to combine all new comments into a single markdown post via the GitHub API.
- Integrated PM2 ecosystem configuration for running both Next.js and the worker simultaneously.

## 2026-04-15: PM2 and Process Management refinements
- Realized the worker needs to be compiled to JS before PM2 can easily run it alongside the Next server.
- Added `tsconfig.worker.json` to handle compiling just `worker.ts` without conflicting with Next.js's compiler setup.
- Updated the `build` script in `package.json` to compile the worker after Next.js builds.
- Added the `dev:worker` script for local development.

## 2026-04-15: Repository Auto-Merge Implementation
- Added logic inside `worker.ts` to handle automatic merging of pull requests.
- Added new schema fields in `Repository`: `autoMergeEnabled`, `requiredApprovals`, `requireCI`, `mergeStrategy`.
- Created an `AutoMergeLog` table to track successes and failures.
- When processing a PR in `checkRepository`, the worker now evaluates if `autoMergeEnabled` is true. If so, it fetches PR details to verify reviews, CI status (checks suite), and mergeability.
- Added a new logs page (`src/app/logs/page.tsx`) and API endpoint to view the auto-merge logs in the frontend.

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

## 2026-04-17: Design Upgrade Proposal via Stitch MCP
- Gevraagd door gebruiker om een upgrade proposal te maken voor de "via de stitch MCP" met betrekking tot de GitHub PR Comment Aggregator.
- Codebase geanalyseerd.
- 3 nieuwe features bedacht: Agent Analytics Dashboard, Visual Template Builder, en Simulator / Preview.
- Een Stitch project aangemaakt en 3 schermen ontworpen ("Dashboard", "Simulator", "Visual Template Builder") gebaseerd op het "Mono Prism" design system (minimalistisch, strak, developer-vriendelijk).
- Gedetailleerd rapport `DESIGN_PROPOSAL.md` in het Nederlands opgesteld, compleet met links naar de gegenereerde designs en uitleg over 4 alternatieve stijlvormen (Glassmorphism, GitHub Native, Neon Dark, Pastel Blocks).
- Visuele varianten (Glassmorphism, Neon Dark, Pastel Blocks, GitHub Native) gegenereerd en toegevoegd.

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
