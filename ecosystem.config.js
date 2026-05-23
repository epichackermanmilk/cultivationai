module.exports = {
  apps: [
    {
      name: 'cultivationai',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/root/cultivation-scraper/webapp',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        // Set these via: pm2 set cultivationai:VPS_API_URL http://localhost:8000
        // or add to /root/cultivation-scraper/webapp/.env.local
      },
    },
  ],
}
