# Future Roadmap & Brainstorming

## 1. Automatic Pull Request Merging
**Goal**: The application should be able to automatically merge Pull Requests after certain conditions are met.

**Brainstorming & Technical Considerations:**
*   **Settings/Configuration:** We need to add configuration options to `Settings` (or per `Repository`) to define the rules for auto-merging:
    *   `autoMergeEnabled` (Boolean)
    *   `requiredApprovals` (Integer, how many reviewers need to approve?)
    *   `requireCI` (Boolean, do we wait for all status checks to pass?)
    *   `mergeStrategy` (String: 'merge', 'squash', 'rebase')
*   **Worker Logic (`worker.ts`):**
    *   Currently, the worker checks for open PRs and aggregates comments. We need to expand this to also check the *status* of PRs.
    *   Use the GitHub API (`octokit.rest.pulls.get`) to check if the PR is `mergeable`.
    *   Use the GitHub API (`octokit.rest.checks.listForRef` or `octokit.rest.repos.getCombinedStatusForRef`) to verify CI/CD pipelines.
    *   Use `octokit.rest.pulls.listReviews` to ensure necessary approvals are met.
    *   If conditions are met, trigger the merge using `octokit.rest.pulls.merge`.
*   **Database Schema (`prisma/schema.prisma`):**
    *   Update `Repository` or `Settings` models to store the auto-merge rules.
    *   Perhaps log auto-merge events in a new table `AutoMergeLog` for the Dashboard.

## 2. Jules API Integration (Task Scheduling)
**Goal**: Put the next batch of tasks into the Jules API.

**Brainstorming & Technical Considerations:**
*   **API Discovery:** We need documentation on the Jules API. What are the endpoints? How do we authenticate? What is the expected JSON payload?
*   **Integration Point:** Once a PR is auto-merged (or potentially right after an aggregated comment is posted), the system should trigger a call to the Jules API.
*   **Task Definition:** What defines "the next batch of tasks"? Is this information stored in our database, or do we pull it from an external source (like a project management board)?
*   **Implementation:** Create a new service file (e.g., `src/lib/julesApi.ts`) that handles the `fetch` requests to the Jules API endpoints.

## 3. Forwarding GitHub Comments to Jules Chat with Delay
**Goal**: Monitor GitHub comments on PRs and forward them to the Jules chat if they haven't been forwarded automatically, after a configurable delay.

**Brainstorming & Technical Considerations:**
*   **Delay Configuration:** Add a new field to `Settings`: `julesChatForwardDelay` (e.g., in minutes).
*   **Verification Mechanism:** How do we know if a comment was "successfully forwarded"?
    *   *Option A:* Does the Jules API provide an endpoint to verify if a comment exists?
    *   *Option B:* Does Jules leave a "receipt" (like an emoji reaction or another comment on GitHub) that we can detect?
    *   *Option C:* Do we just blindly send it if it's past the delay and we haven't tracked sending it ourselves?
*   **Worker Extension (`worker.ts`):**
    *   We are already tracking comments in `ProcessedComment`. We might need to add a flag `forwardedToJules` (Boolean).
    *   Create a new cron-like process (or expand the existing one) that queries `ProcessedComment` where `postedAt < NOW() - julesChatForwardDelay` AND `forwardedToJules == false`.
    *   For these comments, verify if they were forwarded (using the mechanism chosen above).
    *   If not, post them to the Jules chat using the Jules API and update the `forwardedToJules` flag to true.
*   **Database Schema (`prisma/schema.prisma`):**
    *   Add `julesChatForwardDelay` to the `Settings` model.
    *   Add `forwardedToJules` to the `ProcessedComment` model (default `false`).

## Summary of Next Steps for Implementation
1.  **Gather Jules API Specs:** Obtain exact API URLs, authentication methods, and payload structures for (a) creating tasks and (b) posting chat messages.
2.  **Define Auto-Merge Rules:** Clarify exactly when a PR is "ready" to be merged (CI passing, approvals, etc.).
3.  **Define Verification Logic:** Determine the exact method to verify if a comment has already reached Jules chat.
4.  **Update Database & UI:** Add the new configuration fields to Prisma schema, run migrations, and update the Next.js Settings page.
5.  **Implement Logic:** Update `worker.ts` (or break it into multiple smaller workers/services) to handle the new background tasks.
