# GitHub PR Comment Aggregator

A tool built for Proxmox LXC containers to aggregate automated bot comments on GitHub Pull Requests. It waits for configured bots to finish commenting, then posts a single combined comment under your own GitHub account.

## Features
- **Web UI**: Manage GitHub Personal Access Token, repositories, reviewers, and timing delays.
- **SQLite Database**: Lightweight, local storage using Prisma.
- **Background Worker**: Polls GitHub API, identifies relevant comments, respects batch delays, and posts aggregated comments.

## Setup Instructions (Proxmox LXC)

### 1. Install Dependencies
Ensure your LXC container has Node.js (v18+) and npm installed.

```bash
# Update and install Node.js (example using setup_20.x for Debian/Ubuntu)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git
```

### 2. Clone and Install
```bash
git clone <your-repo-url> github-bot
cd github-bot

# Install project dependencies
npm install

# Install PM2 globally for process management
sudo npm install -g pm2
```

### 3. Setup Database
```bash
# Generate Prisma Client and create the SQLite database
npx prisma generate
npx prisma migrate deploy
```

### 4. Build the Project
```bash
# Build the Next.js Web UI
npm run build

# Compile the background worker
npx tsc worker.ts --esModuleInterop --skipLibCheck
```

### 5. Start with PM2
```bash
# Start both the web interface and the background worker
pm2 start ecosystem.config.js

# Save PM2 process list to start on boot
pm2 save
pm2 startup
```

### 6. Configuration
1. Open the Web UI at `http://<LXC_IP>:3000`
2. If you want to use the System Update feature, add a `SYSTEM_UPDATE_SECRET` environment variable to your `.env` file.
3. Go to **Settings** and add your GitHub Personal Access Token (requires `repo` scope).
4. Go to **Repositories** and add the repositories you want to track.
5. Go to **Reviewers** and add the usernames of the bots you want to aggregate.

## How it works
The background worker polls GitHub every X seconds (configurable in Settings). It checks open Pull Requests created by *you* (the owner of the PAT) in the tracked repositories. If it finds new comments from the tracked reviewers, it waits for the configured *Batch Delay*. Once the delay expires, it combines all those bot comments into a single comment and posts it to the PR under your name.
