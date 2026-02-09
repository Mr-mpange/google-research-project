# Redis Quick Start Guide

## What is Redis?

Redis is an in-memory data store used for caching in this application. It dramatically improves performance by storing frequently accessed data in memory.

## Quick Setup Options

### Option 1: Docker (Recommended - Easiest)

```bash
# Start Redis with Docker Compose
docker-compose -f docker-compose.redis.yml up -d

# Check if Redis is running
docker ps | grep redis

# Test connection
docker exec -it research-redis redis-cli ping
# Should return: PONG
```

Access Redis Commander UI at: http://localhost:8081

### Option 2: Local Installation

#### Windows
```bash
# Run the setup script
setup-redis.bat

# Or use Docker
docker run -d -p 6379:6379 --name redis redis:7-alpine
```

#### macOS
```bash
# Install with Homebrew
brew install redis

# Start Redis
brew services start redis

# Test connection
redis-cli ping
```

#### Linux (Ubuntu/Debian)
```bash
# Run the setup script
chmod +x setup-redis.sh
./setup-redis.sh

# Or manually:
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis-server
redis-cli ping
```

## Configuration

Add to your `.env` file:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TLS=false
REDIS_ENABLED=true
```

## Verify Installation

1. **Check Redis is running:**
```bash
redis-cli ping
# Should return: PONG
```

2. **Start your application:**
```bash
npm start
```

3. **Check health endpoint:**
```bash
curl http://localhost:3000/health
```

Should return:
```json
{
  "status": "healthy",
  "services": {
    "redis": "connected"
  }
}
```

## Testing Cache

### Test AI Summary Caching

```bash
# First request (slow - generates summary)
curl http://localhost:3000/api/responses/1

# Second request (fast - from cache)
curl http://localhost:3000/api/responses/1
```

### View Cache Keys

```bash
# Login as admin first, then:
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/cache/keys
```

### Clear Cache

```bash
# Clear all cache
curl -X DELETE -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/cache/clear
```

## Common Issues

### Redis Not Connecting

**Error:** `Redis connection error`

**Solutions:**
1. Check Redis is running: `redis-cli ping`
2. Verify port 6379 is not blocked
3. Check `.env` configuration
4. Review logs: `npm start`

**Note:** The app will still work without Redis, just slower.

### Port Already in Use

**Error:** `Address already in use`

**Solution:**
```bash
# Find process using port 6379
lsof -i :6379  # macOS/Linux
netstat -ano | findstr :6379  # Windows

# Kill the process or use different port
```

### Permission Denied (Linux)

**Error:** `Permission denied`

**Solution:**
```bash
sudo systemctl start redis-server
# Or run with sudo
sudo redis-server
```

## Monitoring

### Redis CLI Commands

```bash
# Connect to Redis
redis-cli

# Check memory usage
INFO memory

# View all keys
KEYS *

# Get key value
GET summary:12345

# Delete key
DEL summary:12345

# Clear all data
FLUSHALL
```

### Application Logs

```bash
# Watch logs for cache operations
npm start | grep -i cache
```

Look for:
- `Redis connected successfully`
- `Cache hit: summary:12345`
- `Cache miss: question:67890`

## Performance Impact

### Without Redis
- AI summary: 2-5 seconds
- API response: 500-1000ms
- Database queries: 100-500ms

### With Redis
- Cached AI summary: 10-50ms (50-100x faster!)
- Cached API response: 10-30ms (20-50x faster!)
- Cached queries: 5-20ms (10-25x faster!)

## Production Deployment

### Google Cloud Memorystore

```bash
# Create Redis instance
gcloud redis instances create research-cache \
  --size=1 \
  --region=us-central1 \
  --redis-version=redis_6_x

# Get connection info
gcloud redis instances describe research-cache \
  --region=us-central1

# Update .env with instance IP
REDIS_HOST=10.x.x.x
REDIS_PORT=6379
```

### Environment Variables for Production

```env
REDIS_HOST=your-redis-instance-ip
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-password
REDIS_TLS=true
REDIS_ENABLED=true
```

## Next Steps

1. ✅ Install Redis
2. ✅ Configure `.env`
3. ✅ Start application
4. ✅ Test cache with API calls
5. 📖 Read full documentation: [docs/REDIS_CACHING.md](docs/REDIS_CACHING.md)

## Need Help?

- 📖 Full Documentation: [docs/REDIS_CACHING.md](docs/REDIS_CACHING.md)
- 🐛 Issues: Check application logs
- 💬 Redis Docs: https://redis.io/documentation
- 🔧 Node Redis: https://github.com/redis/node-redis

## Optional: Redis Commander (GUI)

If using Docker Compose, Redis Commander is available at:
- URL: http://localhost:8081
- View keys, values, and statistics
- Manage cache visually

---

**That's it!** Redis is now caching your AI summaries and API responses for blazing-fast performance! 🚀
