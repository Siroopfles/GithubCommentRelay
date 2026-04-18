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
    let out: number | undefined
    let err: number | undefined
    let child

    try {
      out = fs.openSync(logFile, 'a')
      err = fs.openSync(logFile, 'a')

      child = spawn(updateCommand, {
        shell: true,
        detached: true,
        stdio: ['ignore', out, err],
        cwd: process.cwd()
      })
    } finally {
      // It is safe to close these immediately after spawn(). The spawned child
      // process inherits its own independent copies of these file descriptors.
      if (out !== undefined) fs.closeSync(out)
      if (err !== undefined) fs.closeSync(err)
    }

    let forceKillTimeout: NodeJS.Timeout | undefined

    const UPDATE_TIMEOUT_MS = 30 * 60 * 1000
    const timeout = setTimeout(() => {
      console.error('Update process timed out; terminating process group.')
      if (!child || !child.pid) {
        updateInProgress = false
        return
      }

      try {
        process.kill(-child.pid, 'SIGTERM')
      } catch (error) {
        console.error('Failed to terminate timed-out update process:', error)
        updateInProgress = false
        return
      }

      forceKillTimeout = setTimeout(() => {
        try {
          if (child && child.pid) {
            process.kill(-child.pid, 'SIGKILL')
          }
        } catch (error) {
          console.error('Failed to force-kill timed-out update process:', error)
        } finally {
          updateInProgress = false
        }
      }, 10_000)
      forceKillTimeout.unref()
    }, UPDATE_TIMEOUT_MS)
    timeout.unref()


    if (child) {
      child.on('error', (error) => {
        clearTimeout(timeout)
        if (forceKillTimeout) clearTimeout(forceKillTimeout)
        updateInProgress = false
        console.error('Update execution error:', error)
      })

      child.on('exit', (code) => {
        clearTimeout(timeout)
        if (forceKillTimeout) clearTimeout(forceKillTimeout)
        updateInProgress = false
        if (code !== 0) {
          console.error(`Update process exited with code ${code}`)
        } else {
          console.log('Update process completed successfully.')
        }
      })

      child.unref()
    }

    return NextResponse.json({
      message: 'Update started. The server will pull the latest changes, build, and restart shortly. This may take a few minutes.'
    })
  } catch (error) {
    updateInProgress = false
    console.error('Update initiation error:', error)
    return NextResponse.json({ error: 'Failed to initiate update' }, { status: 500 })
  }
}
