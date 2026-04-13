module.exports = {
  apps: [
    {
      name: 'github-bot-web',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'github-bot-worker',
      script: 'node',
      args: 'worker.js',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
}
