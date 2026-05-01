module.exports = {
  apps: [
    {
      name: 'web',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'worker',
      script: 'node',
      args: 'worker.js',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
