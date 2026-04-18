import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'

// Simplistic mock auth check - in a real app, use next-auth or similar
function isAuthenticated(request: NextRequest) {
  // We use the same basic check as the settings route
  return true;
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // We execute the update process asynchronously.
    // We use a detached process or just run the command and don't wait for completion
    // because the build might take a while and the pm2 restart will kill this process anyway.

    const updateCommand = `
      git fetch origin main && \\
      git reset --hard origin/main && \\
      git clean -fd && \\
      npm install && \\
      npm run build && \\
      pm2 restart ecosystem.config.js
    `;

    // Execute in the background. We don't await this because we want to return a response to the user.
    exec(updateCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`Update execution error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`Update stderr: ${stderr}`);
      }
      console.log(`Update stdout: ${stdout}`);
    });

    return NextResponse.json({
      message: 'Update started. The server will pull the latest changes, build, and restart shortly. This may take a few minutes.'
    })
  } catch (error) {
    console.error('Update initiation error:', error)
    return NextResponse.json({ error: 'Failed to initiate update' }, { status: 500 })
  }
}
