# 🚀 BaBadminton - CI/CD Quick Start Guide

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start (5 minutes)](#quick-start-5-minutes)
3. [Local Development with Docker](#local-development-with-docker)
4. [GitHub Actions Setup](#github-actions-setup)
5. [Deployment Guide](#deployment-guide)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Software | Version | Install Command |
|----------|---------|-----------------|
| Node.js | 20.x | `nvm install 20` |
| npm | 10.x | Comes with Node.js |
| Docker | 24.x | [Download](https://docker.com) |
| Git | Latest | `git --version` |

### Optional (for development)

| Software | Purpose |
|----------|---------|
| VS Code | Code editor |
| Docker Desktop | Docker GUI |
| MySQL Workbench | Database management |

---

## Quick Start (5 minutes)

### Step 1: Clone & Install

```bash
cd C:\Users\User\Documents\GitHub\BaBadProject
npm install
```

### Step 2: Configure Environment

```bash
# Copy environment template
copy .env.example .env

# Edit .env with your settings
# Minimum required: DB_PASSWORD, SESSION_SECRET
notepad .env
```

### Step 3: Run Migrations

```bash
# Run database migrations
npm run migrate
```

### Step 4: Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000

---

## Local Development with Docker

### Option A: Full Stack (App + Database)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop all services
docker-compose down
```

### Option B: App Only (Use Existing Database)

```bash
# Start only the app
docker-compose up -d app

# Or with dev profile (includes phpMyAdmin)
docker-compose --profile dev up -d
```

### Access Services

| Service | URL | Credentials |
|---------|-----|-------------|
| Application | http://localhost:3000 | admin/admin123 |
| phpMyAdmin | http://localhost:8080 | root/[your password] |
| MySQL | localhost:3306 | root/[your password] |

---

## GitHub Actions Setup

### Step 1: Create GitHub Repository

```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit"

# Add remote repository
git remote add origin https://github.com/yourusername/babadminton.git
git push -u origin main
```

### Step 2: Configure GitHub Secrets

Go to: `https://github.com/yourusername/babadminton/settings/secrets/actions`

Add these secrets:

| Secret Name | Value | Required |
|-------------|-------|----------|
| `DB_PASSWORD` | Your MySQL root password | ✅ |
| `SESSION_SECRET` | Random 32+ char string | ✅ |
| `CODECOV_TOKEN` | From codecov.io | ❌ |
| `SNYK_TOKEN` | From snyk.io | ❌ |
| `SLACK_STAGING_WEBHOOK` | Slack webhook URL | ❌ |
| `SLACK_PROD_WEBHOOK` | Slack webhook URL | ❌ |

### Step 3: Push to Trigger CI

```bash
git push origin main
```

GitHub Actions will automatically:
1. ✅ Install dependencies
2. ✅ Run linting
3. ✅ Run unit tests with coverage
4. ✅ Run E2E tests
5. ✅ Build Docker image
6. ✅ Upload artifacts

---

## Deployment Guide

### Deploy to Staging

```bash
# Create and push to develop branch
git checkout -b develop
git push origin develop
```

This triggers the staging deployment pipeline.

### Deploy to Production

```bash
# Merge to main branch
git checkout main
git merge develop
git push origin main
```

This triggers the production deployment pipeline.

### Manual Deployment (Docker)

```bash
# Build production image
npm run docker:build

# Start production stack
docker-compose --profile prod up -d

# View logs
npm run docker:logs
```

---

## Security Hardening

### Run Security Setup

```bash
# Hash all passwords in database
npm run security:setup
```

### Audit Dependencies

```bash
# Check for vulnerabilities
npm audit

# Auto-fix safe vulnerabilities
npm audit fix

# Fix all (may break things)
npm audit fix --force
```

### Run Linting

```bash
# Check code quality
npm run lint

# Auto-fix issues
npm run lint:fix

# Check formatting
npm run format:check

# Fix formatting
npm run format
```

---

## Troubleshooting

### Issue: Docker container won't start

```bash
# Check logs
docker-compose logs app

# Common fix: Remove volumes and restart
docker-compose down -v
docker-compose up -d
```

### Issue: Database connection failed

```bash
# Check if MySQL is running
docker-compose ps

# Test connection
docker-compose exec app node -e "require('./model/data').ping().then(() => console.log('OK'))"

# Fix: Ensure DB_PASSWORD matches in .env and docker-compose.yml
```

### Issue: Tests failing in CI

```bash
# Run tests locally with same environment
NODE_ENV=test DB_HOST=localhost DB_USER=root DB_PASSWORD=xxx DB_NAME=babadminton_test npm test

# Check for missing environment variables in .github/workflows/ci-cd.yml
```

### Issue: Migration failed

```bash
# Check migration status
npm run migrate:status

# Rollback last migration
npm run migrate:rollback

# Fix the migration file and try again
```

---

## Monitoring & Alerts

### Check Application Health

```bash
# Health check
curl http://localhost:3000/health

# Metrics (Prometheus format)
curl http://localhost:3000/metrics

# Readiness probe
curl http://localhost:3000/ready
```

### View Logs

```bash
# Docker logs
docker-compose logs -f app

# Application logs (if running locally)
tail -f logs/combined.log
```

---

## Performance Optimization

### Database Indexes

Run these SQL commands to improve query performance:

```sql
-- Add indexes for faster queries
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_room_date ON bookings(room_id, booking_date);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_users_email ON users(email);
```

### Enable Caching (Redis)

```bash
# Start Redis
docker-compose --profile prod up -d redis

# Update app.js to use Redis for session storage
```

---

## Next Steps

After setup, consider:

1. **Add more tests** - Aim for 85%+ coverage
2. **Set up monitoring** - See MONITORING-SETUP.md
3. **Configure alerts** - Slack/email notifications
4. **Add API documentation** - Swagger/OpenAPI
5. **Implement blue-green deployment** - Zero-downtime deploys

---

## 📚 Additional Documentation

- [PROFILING-REPORT.md](./PROFILING-REPORT.md) - Comprehensive profiling analysis
- [MONITORING-SETUP.md](./MONITORING-SETUP.md) - Monitoring and alerting guide
- [README.md](./README.md) - Project overview

---

## 🆘 Need Help?

- **Documentation:** Check the docs folder
- **Issues:** Create a GitHub issue
- **Emergency:** Contact the development team

---

**Last Updated:** 22 เมษายน 2026  
**Version:** 1.0
