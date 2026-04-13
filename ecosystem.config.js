module.exports = {
  apps: [
    {
      name: 'github-bot-web',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        DATABASE_URL: 'file:./dev.db'
      }
    },
    {
      name: 'github-bot-worker',
      script: 'node',
      args: 'worker.js',
      env: {
        NODE_ENV: 'production',
        DATABASE_URL: 'file:./dev.db'
      }
    }
  ]
}
