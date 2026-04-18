module.exports = {
  apps: [
    {
      name: "github-bot-web",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        DATABASE_URL: "file:./data.db"
      }
    },
    {
      name: "github-bot-worker",
      script: "./worker.js",
      env: {
        NODE_ENV: "production",
        DATABASE_URL: "file:./data.db"
      }
    }
  ]
}
