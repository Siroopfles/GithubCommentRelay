import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'

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
      npm run build && \\
      pm2 restart ecosystem.config.js
    `;

    const child = spawn(updateCommand, {
      shell: true,
      detached: true,
      stdio: 'ignore',
      cwd: process.cwd()
    })

    child.on('error', (error) => {
      updateInProgress = false
      console.error('Update execution error:', error)
    })

    child.on('exit', (code) => {
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
