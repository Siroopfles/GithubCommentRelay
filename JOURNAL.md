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
   - **CI Checking**: Implemented checks against both Github Actions (`checks.listForRef`) and classic Commit Statuses (`repos.getCombinedStatusForRef`). If `requireCI` is enabled, any configured checks _must_ be successful for the merge to proceed.
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

- **Schema Updates:** Added `noActionRegex` field to the `TargetReviewer` database model.
- **UI & API:** Updated the Reviewers settings page and API endpoints to allow setting and editing the `noActionRegex`.
- **No Action Needed Filtering:** Implemented filtering in the background worker. If a comment body matches the author's configured regex, the comment is fully ignored and not persisted.
- **Strikte Inhoudelijke Deduplicatie:** Added deduplication logic in `formatAggregatedBody` that detects duplicate comments from the same author, combining them into one point marked with `[Reported X times]`.
- **Prioritering en Sortering van Feedback:** Formatter now sorts feedback items based on severity tags (`[ACTION: SEC_REVIEW]` > `[ACTION: FIX_ERROR]` > `[ACTION: REVIEW]`).
- **Diff Extractie:** Formatter specifically identifies ` ```diff ` (or ` ``` `) blocks and visually enhances them with a "Suggested Code Changes:" warning header.
- **Minimize Original Comments:** After the worker posts the aggregated comment, it loops over all source comments, fetches their `node_id`, and utilizes the GitHub GraphQL API to minimize the original comments using the `RESOLVED` classifier, maintaining a clean PR chat timeline.
- The Next.js production build and TypeScript compilation completed successfully.

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

## Session Update

- Built a Kanban-style Task Manager to coordinate AI agent tasks.
- Added a `Task` model to Prisma schema to store status, priority, and PR/issue context.
- Added `maxConcurrentTasks` configuration per repository.
- Built a drag-and-drop Kanban board UI at `/tasks`.
- Integrated `syncAndProcessTasks` into the background worker to auto-promote tasks, start AI sessions, and monitor PR merges.

## Session 2026-04-19 - Category E Implementation

Implemented Category E ideas from `IDEAS.md`:

- **Webhooks (21):** Added an `/api/webhooks` route to receive GitHub webhook events (`issue_comment`, `pull_request_review_comment`, `pull_request_review`). These events create a `WebhookSignal` in the database. The background worker now polls this table every 5 seconds to provide near-instant aggregation processing, while falling back to the standard polling interval.
- **Rate Limit Bewaking (22):** Intercepted all `Octokit` API responses in the background worker to read the `x-ratelimit-remaining` and `x-ratelimit-reset` headers. Stored these values in the `Settings` database. The worker now pauses execution if the rate limit drops below 50, and a warning banner appears at the top of the UI (`RateLimitBanner` in `layout.tsx`).
- **Database Auto-Pruning (23):** Added a new `pruneDays` setting (default 60 days) to the `Settings` model and UI. Added a daily `node-cron` job (`0 0 * * *`) in the worker to automatically delete `ProcessedComment` records older than this configured threshold.
- **Gecentraliseerde Logging (24):** Integrated `winston` for file-based logging. Created a `logger` utility that outputs to both console and local `.log` files (`logs/error.log` and `logs/combined.log`). Replaced all `console.log` and `console.error` calls across the API routes and worker with this new logger.
- **Docker & Docker Compose (25):** Created a `Dockerfile` to build both the Next.js application and background worker into a single container image. Created a `docker-compose.yml` to define the service, exposing port 3000 and mounting volumes for the SQLite database (`./data`) and Winston logs (`./logs`).

All Next.js and worker build checks passed.

## Session: IDEAS.md Expansion

**Date**: 2026-04-20

### Context

The user requested adding 50 new ideas to the existing `IDEAS.md` document, building on the first 25. The goal was to provide a broad spectrum of ideas ("ALLES") across categories, focusing on workflow optimizations, deeper GitHub integrations, analytics, agent task management, failsafes, DevOps, and more.

### Changes Made

1. **IDEAS.md Updated**: Appended Categories F through U, providing exactly 50 new ideas (numbered 26 to 105).
2. **Categories Added**:
   - F: Geavanceerde GitHub API & Webhooks Integratie
   - G: Analytics, Metrics & Dashboard Inzichten
   - H: AI-Agent Workflow & Taakbeheer
   - I: Kwaliteitscontrole & Validatie van AI Acties
   - J: Team & Multi-Agent Samenwerking
   - K: Configuraties, Templates & Theming (UI/UX)
   - L: Performance, Caching & Resource Management
   - M: Security, Privacy & Access Control
   - N: Notificaties, Alerts & Externe Integraties
   - O: Onderhoud, Backup & Proxmox/LXC Systeembeheer
   - P: Specifieke AI-Agent Instructies & Context
   - Q: Feedback Loops & Lerende Systemen
   - R: Uitgebreide GitHub Workflow Automatiseringen
   - S: Ontwikkeling & Test Omgevingen (DevX)
   - T: Integraties met andere Development Tools
   - U: Lange Termijn Visie & Community

### Notes

- The additions reflect the project's identity as a hub for local AI agents without hosting the LLM directly itself.
- All ideas were written in Dutch, as requested and previously maintained in the document.

## 2026-04-20: Category F - Advanced GitHub Integrations
- Implemented **Check Runs Mapping**:
  - `includeCheckRuns` boolean added to `Repository` and `BatchSession` Prisma models.
  - Worker configured to fetch check runs if enabled.
  - UI toggles added in Repository settings and individual PR details pages.
- Implemented **Action Triggers**:
  - Created `/api/repositories/[id]/pr/[prNumber]/trigger-checks` endpoint to find and re-run failed Check Suites via the GitHub API.
  - Placed "Restart Checks" button in the PR list view UI.
- Implemented **Threading & Replies**:
  - Modified worker to extract `path`, `line`, and `side` from batched review comments.
  - Tries to create an inline review comment (`octokit.rest.pulls.createReviewComment`) using the aggregated summary if mapping is successful.
- Implemented **Server-Sent Events (SSE)**:
  - Setup real-time updates for PR processing states using `/api/repositories/[id]/sse/route.ts` with a `ReadableStream`. Replaced client-side polling interval with a live SSE connection.
- Implemented **Label Syncing**:
  - Added `PRLabelRule` Prisma model.
  - Updated worker to apply/remove specified labels on `processing_start` and `processing_done` events.
  - Added UI within the repo configuration modal to manage these custom label automation rules.
## Session: Analytics, Metrics & Dashboard Inzichten (IDEAS Category G)
The user requested the implementation of Category G from `IDEAS.md`. This included ideas:
- 31. Bot-activiteit Heatmap (Kalender)
- 32. Resolutie-Tijd Tracker
- 33. Fout-Categorie Dashboards
- 34. GitHub Rate Limit & API Verbruik Historie
- 35. AI-Agent Succes Ratio

1. **Schema Updates:** Added `category` to `ProcessedComment`. Added fields to `BatchSession` (`resolved`, `resolvedAt`) to track resolution time. Added new models `RateLimitLog` and `AIAgentAction`.
2. **Worker Updates:** The worker now attempts to categorize comments based on keywords (`lint`, `security`, `type_error`, `test_failure`). It records GitHub API limit drops and inserts them into `RateLimitLog`. Also queries GitHub PR status to mark batch sessions as `resolved` to track resolution time.
3. **API endpoint:** Created a new endpoint `GET /api/analytics` to aggregate database stats (heatmap counts, average resolution time, rate limit history, and category breakdown).
4. **Dashboard:** Added `recharts` for charts. Built a new subcomponent `<AnalyticsDashboard />` embedded in `DashboardClient.tsx`. User can toggle between the 'Overview' (list of active sessions and recent comments) and 'Analytics & Metrics' (charts and KPIs).

All tests and builds pass.

## 2026-04-22: Implemented Category H Ideas (AI-Agent Workflow & Task Management)
- **Idea 36: Priority Queues for PRs:** Added `isHighPriority` to `BatchSession` and integrated UI toggle in the Dashboard. The worker now injects a `🚨 [PRIORITY: HIGH]` flag if true.
- **Idea 37: Agent-Specific Routing:** Created the `BotAgentMapping` model. Settings page has a UI to manage bot to agent mappings. The worker automatically swaps bot names for agent tags in the Markdown output.
- **Idea 38: Task Dependencies in Kanban:** Added `dependsOnId` to `Task` model. The UI Kanban prevents dragging a task if its parent dependency is not resolved (status not `done`), and highlights blocked tasks.
- **Idea 39: Auto-promotion based on GitHub Activity:** Updated the `webhooks` API endpoint to auto-promote Tasks based on PR webhook events (`opened` -> `in_progress`, `review_requested` -> `in_review`, `closed` -> `done`).
- **Idea 40: Manual Prompt Injection:** Added `manualPrompt` to `BatchSession` and provided a UI field in the Dashboard. The worker injects the prompt and nullifies the database field right after usage.

## 2026-04-24 - Categorie I: Kwaliteitscontrole & Validatie van AI Acties
- Added AI Regression Detection: Worker now cross references current Bot comments against previous errors from the same PR/Bot. If an AI agent attempts a fix and the same bot error persists, it's flagged as a Regression.
- Added Infinite Loop Prevention: Prs now pause processing if the AI ping-pongs over a configurable threshold limit (defaults to 3). Unpausing can be triggered from the Dashboard UI.
- Added Max Diff Validations: Compares AI commit diff sizes against a defined limit. Emits a warning if an agent goes rogue and rewrites too many lines.
- Implemented Advanced Complexity Heuristics: Created a customizable algorithm that weights error stacktraces, keywords, and file counts to output an EASY/MEDIUM/HARD/CRITICAL severity label and numerical score per PR.
- Implemented A/B Testing Prompts: Added a new `PromptTemplate` table. Repository settings now support CRUD for multiple prompts, where the worker will randomly choose an active one per comment cycle. Supports custom variables like `{{botComments}}` and `{{complexityScore}}`.

## Session 2026-04-24 - Categorie J: Team & Multi-Agent Samenwerking

Implemented the features from Categorie J based on a clarified scope where the system acts as a relay bot for the Jules API (without running any internal local AI agents itself).

### Changes Made:

1. **Jules Persona's / Rollen (Idee 46)**:
   - Expanded `BotAgentMapping` in the Prisma schema with an optional `role` field.
   - Updated the `/api/bot-agent-mappings` endpoints and the `SettingsPage` to support configuring a specific Persona/Role for each CI tool.
   - Modified `formatAggregatedBody` in `src/lib/format_helper.ts` to instruct Jules to adopt the assigned Role in its `systemPrompt`.

2. **Jules vs. CI Bot Historie (Idee 47)**:
   - Enhanced the PR details page (`/repositories/[id]/page.tsx`) with a combined "Conversation History" timeline.
   - Merged locally tracked Bot comments (CI reports) and recent Jules Relay Worker logs (success, failure, batching status) into a single, chronologically sorted UI timeline.

3. **Beheerder Override / Stop Knop (Idee 48)**:
   - Added a "Stop Jules" / "Resume Jules" toggle in the PR details UI.
   - Updated the `BatchSession` model API endpoint (`PATCH /api/batch-sessions/[id]`) to flip `isPaused`.
   - Crucially, when `isPaused` is set to true, the API now creates a GitHub comment on the PR stating `🛑 ADMIN OVERRIDE: Agent, STOP.` ensuring human intervention is explicitly declared on the repo.

4. **Gerichte Jules Instructies (Idee 49)**:
   - Updated `format_helper.ts` to transform specific `actionTags` from incoming bot comments into highly visible instructions inside the payload for Jules. E.g. `[SECURITY REVIEW REQUIRED]` or `[ERROR FIX REQUIRED]`.

5. **Mens vs. Jules Conflict Detectie (Idee 50)**:
   - Added `hasConflict` field to `BatchSession`.
   - The `/api/webhooks` route now monitors incoming GitHub events for comments or code changes made by human users (i.e., accounts with `type: 'User'`).
   - If a human acts while Jules is processing (`BatchSession` is open/unprocessed), the `hasConflict` flag is set to true.
   - This explicitly displays an orange `⚠️ Conflict (Human)` warning in the PR details dashboard.

6. **Taak Koppeling (Bonus)**:
   - Added `prNumber` and `julesSessionId` fields to the `Task` schema, API, and the Kanban UI so the human admin can directly link tasks to specific GitHub Pull Requests and active Jules Sessions.

All builds and tests passing.

## Sessie: Categorie K & Visual Rule Builder
**Datum:** `2024-04-25`

### Wat we hebben bereikt
1. **Compact Mode (Idee 54):** Een React Context (`CompactModeContext`) gecreëerd en een toggle toegevoegd in de zijbalk die `localStorage` gebruikt. Door de hele app CSS styling toegepast om de UI in te klappen.
2. **Import / Export (Idee 51):** API routes gemaakt (`/api/system/export` en `/import`) om instellingen, repositories, reviewers, en bot mappings the importeren en exporteren. Een UI paneel in de "Settings" pagina met checkboxes gebouwd om gedeeltelijke/volledige imports mogelijk te maken.
3. **Repository Mappen/Groepen (Idee 53):** `groupName` veld toegevoegd aan het `Repository` schema, formulieren uitgebreid en de repository overzichtspagina verdeeld in uitklapbare secties per groep.
4. **Markdown Template Builder (Idee 52):** `TemplateBuilder` component gemaakt ter vervanging van de standaard tekstvelden voor markdown sjablonen. Het ondersteunt nu knoppen om simpel variabelen als `{{bot_name}}` in de tekst in te voegen.
5. **Settings Audit Log (Idee 55):** Database schema uitgebreid met `AuditLog`. Systeem registreert wijzigingen zoals 'UPDATE_SETTINGS' en 'IMPORT_CONFIG'. De logboekgeschiedenis is nu inzichtelijk gemaakt via een nieuw tabblad in de Settings weergave.
6. **Visual Chat Filter Builder (Nieuw IDEE):** Een nieuwe pagina toegevoegd in `/logs/chat`. Deze tool laat rauwe PR-comments zien in een interactieve feed. Door simpelweg tekst de highlighten met de muis kan een gebruiker direct een ignore regel (RegExp) aanmaken via een pop-up dialog.

### Volgende stappen
- Integreren van AI LLM verzoeken met de geëxporteerde prompt structuren en het uittesten van Categorie J of de andere openstaande ideeën.

---

## 2026-04-26: Integrated Jules API
* Updated Prisma Schema to store Jules Session fields on the Task model (julesSessionState, julesSessionUrl, julesSessionPrUrl, julesSessionCreatedAt).
* Enhanced `src/lib/julesApi.ts` to implement API endpoints for `getSession`, `listActivities`, `approvePlan`, matching Jules REST API specification.
* Created Next.js API Routes under `src/app/api/jules` to bridge frontend application with Jules API.
* Added auto-sync task to `worker.ts` that polls active Jules sessions via `getSession` and extracts Pull Request links/numbers from the final Output.
* Updated Task Management UI (`src/app/tasks/page.tsx`) with a "Dispatch to Jules" modal feature. Users can now easily start a session for a task on a specified branch.
* Built the Jules Dashboard (`src/app/jules/page.tsx`) providing an intuitive way to view all Jules sessions, their states, detailed log activity (Terminal outputs, agent messages, plan steps), and interface components to send messages and approve generated plans.

## Performance, Caching & Resource Management (Categorie L) geimplementeerd

- **In-Memory Cache (56 & 60):** \`lru-cache\` geconfigureerd om \`prisma.settings.findUnique\` te cachen en load op de database te verminderen.
- **E-tag / HTTP 304 Polling Optimalisatie (57):** In \`worker.ts\` een E-Tag response cache (memory-based) ingebouwd voor de trage \`octokit\` requesten (pulls list, issue/review comments). Bij 304 Not Modified slaan we de volledige verwerking over (rate-limits saved!).
- **Volledig Parallelle Repository Processing (58):** De grote repos loop in \`processRepositories()\` in \`worker.ts\` herschreven naar een \`await Promise.all()\` constructie, wat de doorvoersnelheid massaal verhoogt.
- **Agressieve Text/Log Stripping (59):** Base64 en lange hex strings worden met een regex-stripper filter weggelaten uit de payload, dit bespaart input tokens in de LLM!
- **Prisma Query Optimalisatie (60):** Enkele zware \`findMany\` queries op de Repository table teruggebracht naar enkel de echt benodigde kolommen (id, owner, token, etc), waardoor memory consumption verlaagd is.
