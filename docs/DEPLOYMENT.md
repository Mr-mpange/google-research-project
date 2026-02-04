# Deployment Guide

## Production Deployment with Docker

### Prerequisites

1. **Server Requirements**
   - Ubuntu 20.04+ or CentOS 8+
   - 4GB RAM minimum (8GB recommended)
   - 50GB storage minimum
   - Docker and Docker Compose installed

2. **Domain and SSL**
   - Domain name pointing to your server
   - SSL certificate (Let's Encrypt recommended)

3. **Africa's Talking Account**
   - API credentials
   - USSD shortcode
   - Voice number

4. **OpenAI Account**
   - API key for speech-to-text and summarization

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login to apply docker group changes
```

### Step 2: Application Setup

```bash
# Clone repository
git clone <your-repo-url>
cd voice-ussd-research-system

# Create environment file
cp .env.example .env

# Edit environment variables
nano .env
```

### Step 3: Environment Configuration

Edit `.env` file with your production values:

```bash
# Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
BASE_URL=https://your-domain.com

# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=research_system
DB_USER=postgres
DB_PASSWORD=your_secure_password

# Africa's Talking Configuration
AT_USERNAME=your_username
AT_API_KEY=your_api_key
AT_SHORTCODE=your_shortcode
AT_VOICE_NUMBER=your_voice_number

# USSD Configuration
USSD_CODE=*123*345#
USSD_SERVICE_CODE=123*345

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-3.5-turbo

# JWT Configuration
JWT_SECRET=your_very_secure_jwt_secret_key_here
JWT_EXPIRES_IN=24h

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

### Step 4: SSL Certificate Setup

```bash
# Create SSL directory
mkdir -p ssl

# Option 1: Let's Encrypt (Recommended)
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/key.pem

# Option 2: Self-signed (Development only)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem -out ssl/cert.pem
```

### Step 5: Deploy Application

```bash
# Build and start services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f app

# Run database migrations
docker-compose exec app npm run db:migrate

# Create initial admin user
docker-compose exec app node -e "
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const pool = new Pool({
  host: 'postgres',
  port: 5432,
  database: 'research_system',
  user: 'postgres',
  password: process.env.DB_PASSWORD
});
(async () => {
  const hash = await bcrypt.hash('admin123', 12);
  await pool.query(
    'INSERT INTO users (username, email, password_hash, full_name, role) VALUES ($1, $2, $3, $4, $5)',
    ['admin', 'admin@example.com', hash, 'System Administrator', 'admin']
  );
  console('Admin user created');
  process.exit(0);
})();
"
```

### Step 6: Configure Africa's Talking

1. **USSD Configuration**
   - Login to Africa's Talking dashboard
   - Go to USSD → My Codes
   - Set callback URL: `https://your-domain.com/ussd/callback`

2. **Voice Configuration**
   - Go to Voice → Numbers
   - Set callback URL: `https://your-domain.com/voice/callback`

### Step 7: Monitoring and Maintenance

```bash
# Monitor logs
docker-compose logs -f

# Update application
git pull
docker-compose build app
docker-compose up -d app

# Backup database
docker-compose exec postgres pg_dump -U postgres research_system > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres research_system < backup.sql
```

## Manual Deployment (Without Docker)

### Prerequisites

```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Install PM2 for process management
sudo npm install -g pm2
```

### Setup Steps

```bash
# Clone and install
git clone <your-repo-url>
cd voice-ussd-research-system
npm install

# Setup database
sudo -u postgres createdb research_system
sudo -u postgres psql research_system < src/database/schema.sql

# Configure environment
cp .env.example .env
# Edit .env with your values

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Security Considerations

1. **Firewall Configuration**
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

2. **Regular Updates**
```bash
# System updates
sudo apt update && sudo apt upgrade -y

# Application updates
git pull
docker-compose build app
docker-compose up -d app
```

3. **Backup Strategy**
```bash
# Daily database backup
0 2 * * * docker-compose exec postgres pg_dump -U postgres research_system | gzip > /backups/db_$(date +\%Y\%m\%d).sql.gz

# Weekly full backup
0 3 * * 0 tar -czf /backups/full_$(date +\%Y\%m\%d).tar.gz /path/to/app
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
```bash
# Check database status
docker-compose logs postgres

# Reset database
docker-compose down
docker volume rm voice-ussd-research-system_postgres_data
docker-compose up -d
```

2. **USSD Not Working**
- Verify callback URL in Africa's Talking dashboard
- Check firewall settings
- Verify SSL certificate

3. **Voice Calls Failing**
- Check voice number configuration
- Verify callback URLs
- Check audio file permissions

### Performance Optimization

1. **Database Optimization**
```sql
-- Add indexes for better performance
CREATE INDEX CONCURRENTLY idx_responses_created_at ON research_responses(created_at);
CREATE INDEX CONCURRENTLY idx_responses_phone_type ON research_responses(phone_number, response_type);
```

2. **Application Scaling**
```yaml
# docker-compose.yml - Scale app instances
services:
  app:
    deploy:
      replicas: 3
```

## Monitoring

### Health Checks

```bash
# Application health
curl https://your-domain.com/health

# Database health
docker-compose exec postgres pg_isre