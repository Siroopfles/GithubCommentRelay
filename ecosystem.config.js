const path = require('path');

module.exports = {
  apps: [
    {
      name: "github-bot-web",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        DATABASE_URL: `file:${path.join(__dirname, 'data.db')}`
      }
    },
    {
      name: "github-bot-worker",
      script: path.join(__dirname, 'worker.js'),
      env: {
        NODE_ENV: "production",
        DATABASE_URL: `file:${path.join(__dirname, 'data.db')}`
      }
    }
  ]
}
