/**
 * Health Check Controller
 *
 * Provides endpoints for monitoring application health and metrics
 */

const data = require('../model/data');

/**
 * GET /health
 * Basic health check for load balancers and orchestrators
 */
async function getHealth(req, res) {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {}
  };

  let isHealthy = true;

  // Check database connection
  try {
    await data.ping();
    health.checks.database = {
      status: 'ok',
      responseTime: Date.now()
    };
  } catch (error) {
    health.checks.database = {
      status: 'error',
      message: error.message
    };
    health.status = 'degraded';
    isHealthy = false;
  }

  // Check memory usage
  const memUsage = process.memoryUsage();
  const memoryMB = {
    used: Math.round(memUsage.heapUsed / 1024 / 1024),
    total: Math.round(memUsage.heapTotal / 1024 / 1024),
    external: Math.round(memUsage.external / 1024 / 1024)
  };

  health.checks.memory = {
    status: memoryMB.used > 400 ? 'warning' : 'ok',
    ...memoryMB
  };

  if (memoryMB.used > 500) {
    health.status = 'degraded';
    isHealthy = false;
  }

  // Check environment
  health.checks.environment = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || 3000
  };

  const statusCode = isHealthy ? 200 : 503;
  res.status(statusCode).json(health);
}

/**
 * GET /metrics
 * Detailed metrics for monitoring systems (Prometheus-compatible format)
 */
async function getMetrics(req, res) {
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();

  // Prometheus-style metrics
  const metrics = `
# HELP node_app_uptime_seconds Application uptime in seconds
# TYPE node_app_uptime_seconds counter
node_app_uptime_seconds ${uptime.toFixed(2)}

# HELP node_app_memory_used_bytes Heap memory used by application
# TYPE node_app_memory_used_bytes gauge
node_app_memory_used_bytes ${memUsage.heapUsed}

# HELP node_app_memory_total_bytes Total heap memory available
# TYPE node_app_memory_total_bytes gauge
node_app_memory_total_bytes ${memUsage.heapTotal}

# HELP node_app_memory_external_bytes External memory (buffers, etc.)
# TYPE node_app_memory_external_bytes gauge
node_app_memory_external_bytes ${memUsage.external}

# HELP node_app_memory_rss_bytes Resident Set Size (total memory allocated)
# TYPE node_app_memory_rss_bytes gauge
node_app_memory_rss_bytes ${memUsage.rss}

# HELP node_app_node_version Node.js version
# TYPE node_app_node_version gauge
node_app_node_version ${process.version}

# HELP node_app_pid Process ID
# TYPE node_app_pid gauge
node_app_pid ${process.pid}
`;

  res.set('Content-Type', 'text/plain');
  res.send(metrics);
}

/**
 * GET /ready
 * Readiness probe - checks if app is ready to accept traffic
 */
async function getReadiness(req, res) {
  const ready = {
    status: 'ready',
    timestamp: new Date().toISOString(),
    checks: {}
  };

  let isReady = true;

  // Check database
  try {
    await data.ping();
    ready.checks.database = 'ok';
  } catch (error) {
    ready.checks.database = 'error';
    ready.status = 'not_ready';
    isReady = false;
  }

  // Check if server has been initialized
  ready.checks.initialized = global.serverInitialized ? 'ok' : 'not_ready';
  if (!global.serverInitialized) {
    isReady = false;
  }

  const statusCode = isReady ? 200 : 503;
  res.status(statusCode).json(ready);
}

/**
 * GET /live
 * Liveness probe - checks if app is alive (simple ping)
 */
async function getLiveness(req, res) {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    pid: process.pid
  });
}

module.exports = {
  getHealth,
  getMetrics,
  getReadiness,
  getLiveness
};
