import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

let updateInProgress = false

export async function POST(request: NextRequest) {
  // Check for the shared secret in the Authorization header
  const authHeader = request.headers.get('Authorization')
  const expectedToken = process.env.SYSTEM_UPDATE_SECRET

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (updateInProgress) {
    return NextResponse.json({ error: 'Update already in progress' }, { status: 409 })
  }

  try {
    updateInProgress = true

    const updateCommand = `
      git fetch origin main && \\
      git reset --hard origin/main && \\
      npm install && \\
      npx prisma migrate deploy && \\
      npm run build && \\
      pm2 restart ecosystem.config.js
    `;

    const logFile = path.join(process.cwd(), 'system-update.log')
    const out = fs.openSync(logFile, 'a')
    const err = fs.openSync(logFile, 'a')

    const child = spawn(updateCommand, {
      shell: true,
      detached: true,
      stdio: ['ignore', out, err],
      cwd: process.cwd()
    })

    const UPDATE_TIMEOUT_MS = 30 * 60 * 1000
    const timeout = setTimeout(() => {
      console.error('Update process timed out; terminating process group.')
      if (child.pid) {
        try {
          process.kill(-child.pid, 'SIGTERM')
        } catch (error) {
          console.error('Failed to terminate timed-out update process:', error)
        }
      }
      updateInProgress = false
    }, UPDATE_TIMEOUT_MS)
    timeout.unref()


    child.on('error', (error) => {
      clearTimeout(timeout)
      updateInProgress = false
      console.error('Update execution error:', error)
    })

    child.on('exit', (code) => {
      clearTimeout(timeout)
      updateInProgress = false
      if (code !== 0) {
        console.error(`Update process exited with code ${code}`)
      } else {
        console.log('Update process completed successfully.')
      }
    })

    child.unref()

    return NextResponse.json({
      message: 'Update started. The server will pull the latest changes, build, and restart shortly. This may take a few minutes.'
    })
  } catch (error) {
    updateInProgress = false
    console.error('Update initiation error:', error)
    return NextResponse.json({ error: 'Failed to initiate update' }, { status: 500 })
  }
}
