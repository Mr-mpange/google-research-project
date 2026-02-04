module.exports = {
  apps: [
    {
      name: 'research-system',
      script: 'src/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      // Logging
      log_file: 'logs/combined.log',
      out_file: 'logs/out.log',
      error_file: 'logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Process management
      min_uptime: '10s',
      max_restarts: 10,
      autorestart: true,
      
      // Memory management
      max_memory_restart: '1G',
      
      // Monitoring
      pmx: true,
      
      // Advanced features
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads'],
      
      // Environment variables
      env_file: '.env'
    },
    {
      name: 'ai-worker',
      script: 'src/workers/aiWorker.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        WORKER_MODE: 'ai_processing'
      },
      env_production: {
        NODE_ENV: 'production',
        WORKER_MODE: 'ai_processing'
      },
      // Logging
      log_file: 'logs/ai-worker.log',
      out_file: 'logs/ai-worker-out.log',
      error_file: 'logs/ai-worker-error.log',
      
      // Process management
      autorestart: true,
      max_restarts: 5,
      min_uptime: '30s',
      
      // Cron restart (daily at 3 AM)
      cron_restart: '0 3 * * *',
      
      env_file: '.env'
    }
  ]
};