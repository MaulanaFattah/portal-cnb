module.exports = {
  apps: [
    {
      name: "portal-cnb-backend",
      script: "src/server.js",
      cwd: "/root/portal-cnb/backend",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
