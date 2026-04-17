module.exports = {
  apps: [
    {
      name: 'github-bot-web',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        DATABASE_URL: 'file:./data.db'
      }
    },
    {
      name: 'github-bot-worker',
      script: 'worker.ts',
      interpreter: 'node',
      interpreter_args: '--require ts-node/register',
      env: {
        NODE_ENV: 'production',
        DATABASE_URL: 'file:./data.db'
      }
    }
  ]
}
