# 🏸 BaBadminton - Monitoring & Alerting Setup

## Quick Start

This guide covers monitoring setup for BaBadminton Court Booking System.

---

## 📊 Health Check Endpoints

After implementing the health controller, you'll have these endpoints:

| Endpoint | Purpose | Check Frequency | Alert On Failure |
|----------|---------|-----------------|------------------|
| `GET /health` | Overall health | Every 30s | After 2 failures |
| `GET /ready` | Readiness probe | Every 10s | Immediately |
| `GET /live` | Liveness probe | Every 5s | After 3 failures |
| `GET /metrics` | Prometheus metrics | Every 15s | N/A |

### Example Responses

**GET /health**
```json
{
  "status": "ok",
  "timestamp": "2026-04-22T07:30:00.000Z",
  "uptime": 86400.5,
  "checks": {
    "database": {
      "status": "ok",
      "responseTime": 1649901000000
    },
    "memory": {
      "status": "ok",
      "used": 125,
      "total": 256,
      "external": 2
    },
    "environment": {
      "NODE_ENV": "production",
      "PORT": 3000
    }
  }
}
```

**GET /ready**
```json
{
  "status": "ready",
  "timestamp": "2026-04-22T07:30:00.000Z",
  "checks": {
    "database": "ok",
    "initialized": "ok"
  }
}
```

---

## 🔔 Monitoring Tools Setup

### Option 1: UptimeRobot (Free & Simple)

**Setup Steps:**

1. Go to https://uptimerobot.com/
2. Create account (free tier: 50 monitors, 5-min intervals)
3. Add new monitor:
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** BaBadminton Production
   - **URL:** `https://yourdomain.com/health`
   - **Monitoring Interval:** 5 minutes
   - **Advanced Settings:**
     - Timeout: 30 seconds
     - Expected status codes: 200,201,202,203,204

**Alert Channels:**
- Email (free)
- SMS (paid)
- Slack webhook (free)
- Telegram bot (free)

---

### Option 2: Prometheus + Grafana (Self-Hosted)

**docker-compose.monitoring.yml:**
```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: babadminton-prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    ports:
      - "9090:9090"
    networks:
      - babadminton-network

  grafana:
    image: grafana/grafana:latest
    container_name: babadminton-grafana
    volumes:
      - grafana-data:/var/lib/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
    networks:
      - babadminton-network
    depends_on:
      - prometheus

volumes:
  prometheus-data:
  grafana-data:
```

**prometheus.yml:**
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'babadminton'
    static_configs:
      - targets: ['app:3000']
    metrics_path: '/metrics'
```

---

### Option 3: Sentry (Error Tracking)

**Installation:**
```bash
npm install @sentry/node
```

**Setup in app.js:**
```javascript
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% sampling
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ app }),
  ],
});

// Request handler must be first middleware
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// Error handler must be last middleware
app.use(Sentry.Handlers.errorHandler());
```

**Alert Rules:**
- New error type detected → Slack notification
- Error rate > 1% → Email + Slack
- Critical error (5xx) → PagerDuty

---

## 📈 Metrics to Track

### Application Metrics

| Metric | Type | Warning | Critical |
|--------|------|---------|----------|
| Response Time (P95) | Latency | > 400ms | > 800ms |
| Error Rate | Percentage | > 0.5% | > 2% |
| Memory Usage | Bytes | > 400MB | > 500MB |
| Active Connections | Count | > 80% pool | > 95% pool |
| Uptime | Percentage | < 99.9% | < 99% |

### Business Metrics

| Metric | Type | Warning | Critical |
|--------|------|---------|----------|
| Failed Logins (per min) | Count | > 10 | > 50 |
| Booking Failures | Count | > 5/hour | > 20/hour |
| Payment Failures | Count | > 2/hour | > 10/hour |
| Concurrent Users | Count | > 500 | > 1000 |

---

## 🚨 Alert Configuration

### Slack Integration

**Create Incoming Webhook:**
1. Go to https://your-workspace.slack.com/apps/manage/custom-integrations
2. Search "Incoming WebHooks"
3. Add to Slack → Choose channel (#babadminton-alerts)
4. Copy Webhook URL to `.env`:
   ```
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXX/YYY/ZZZ
   ```

**Alert Function:**
```javascript
const axios = require('axios');

async function sendSlackAlert(message, severity = 'warning') {
  const colors = {
    info: '#36a64f',
    warning: '#ffcc00',
    critical: '#ff0000'
  };

  await axios.post(process.env.SLACK_WEBHOOK_URL, {
    attachments: [{
      color: colors[severity],
      title: `🏸 BaBadminton Alert - ${severity.toUpperCase()}`,
      text: message,
      ts: Math.floor(Date.now() / 1000)
    }]
  });
}

// Usage
sendSlackAlert('Database connection failed', 'critical');
```

---

## 📝 Logging Best Practices

### Structured Logging

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'babadminton' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});

// Usage
logger.info('User logged in', { userId: 123, ip: '192.168.1.1' });
logger.error('Database connection failed', { error: err.message });
```

### Log Levels

| Level | When to Use |
|-------|-------------|
| `error` | System failures, exceptions |
| `warn` | Recoverable issues, deprecated features |
| `info` | Important business events (login, booking) |
| `debug` | Detailed debugging info |
| `verbose` | Very detailed tracing |

---

## 🔧 Implementation Checklist

### Phase 1: Basic Monitoring (Week 1)
- [ ] Add health controller to app.js
- [ ] Set up UptimeRobot monitoring
- [ ] Configure Slack alerts
- [ ] Add structured logging

### Phase 2: Advanced Monitoring (Week 2)
- [ ] Deploy Prometheus + Grafana
- [ ] Create Grafana dashboards
- [ ] Set up Sentry for error tracking
- [ ] Configure alert rules

### Phase 3: Business Metrics (Week 3)
- [ ] Track booking success rate
- [ ] Monitor payment failures
- [ ] User activity analytics
- [ ] Performance trending

---

## 📊 Example Grafana Dashboard

**Import Dashboard ID:** (Create custom)

**Panels:**
1. **Uptime** - Single stat (target: 99.9%)
2. **Response Time** - Time series (P50, P95, P99)
3. **Error Rate** - Time series (4xx, 5xx)
4. **Memory Usage** - Time series (used vs total)
5. **Active Users** - Time series
6. **Bookings per Hour** - Time series
7. **Database Connections** - Gauge
8. **Top Errors** - Table

---

## 🆘 Incident Response

### Severity Levels

| Severity | Description | Response Time | Example |
|----------|-------------|---------------|---------|
| **SEV1** | Critical - System down | Immediate | Database down, 500 errors |
| **SEV2** | High - Major feature broken | < 1 hour | Booking failures |
| **SEV3** | Medium - Minor issue | < 4 hours | Slow response times |
| **SEV4** | Low - Cosmetic/minor | < 24 hours | UI glitch |

### Runbook Template

```markdown
# Incident: [Brief description]

**Severity:** SEV1/2/3/4
**Started:** YYYY-MM-DD HH:MM
**Detected By:** [Monitoring/Alert/User report]

## Impact
- What's broken:
- Users affected:
- Business impact:

## Timeline
- HH:MM - Alert fired
- HH:MM - Engineer acknowledged
- HH:MM - Root cause identified
- HH:MM - Fix deployed
- HH:MM - Incident resolved

## Root Cause
[Description]

## Resolution
[What was done]

## Action Items
- [ ] Prevent recurrence
- [ ] Improve monitoring
- [ ] Update documentation
```

---

## 📚 Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Sentry Documentation](https://docs.sentry.io/)
- [UptimeRobot API](https://uptimerobot.com/api/)
- [Winston Logger](https://github.com/winstonjs/winston)

---

**Last Updated:** 22 เมษายน 2026  
**Version:** 1.0
