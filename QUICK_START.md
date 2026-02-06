# 🚀 Quick Start Guide - Complete Setup in 10 Minutes

## 📋 Prerequisites Checklist

- [ ] Google Cloud account (free tier available)
- [ ] Africa's Talking account (sandbox free)
- [ ] Git installed
- [ ] Node.js 18+ installed (for local dev)
- [ ] Google Cloud SDK installed

---

## ⚡ Option 1: Deploy to Google Cloud Run (RECOMMENDED - BONUS POINTS!)

### Step 1: Install Google Cloud SDK (if not installed)

**Windows:**
```powershell
# Download and run installer
# https://cloud.google.com/sdk/docs/install
```

**Mac:**
```bash
brew install --cask google-cloud-sdk
```

**Linux:**
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

### Step 2: Setup Google Cloud

```bash
# Login to Google Cloud
gcloud auth login

# Create new project (or use existing)
gcloud projects create research-system-PROJECT_ID --name="Research System"

# Set project
gcloud config set project research-system-PROJECT_ID

# Enable required APIs (takes 2-3 minutes)
gcloud services enable run.googleapis.com \
  cloudbuild.googleapis.com \
  sqladmin.googleapis.com \
  storage.googleapis.com \
  speech.googleapis.com \
  secretmanager.googleapis.com
```

### Step 3: Get API Keys

**Google Gemini API Key:**
1. Go to https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key

**Africa's Talking API Key:**
1. Go to https://account.africastalking.com/
2. Sign up (sandbox is free)
3. Go to Settings → API Key
4. Copy your API key and username

### Step 4: Store Secrets

```bash
# Store Gemini API key
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=-

# Store Africa's Talking API key
echo -n "YOUR_AT_API_KEY" | gcloud secrets create at-api-key --data-file=-

# Store JWT secret (generate random string)
echo -n "$(openssl rand -base64 32)" | gcloud secrets create jwt-secret --data-file=-

# Store Africa's Talking username
echo -n "YOUR_AT_USERNAME" | gcloud secrets create at-username --data-file=-
```

### Step 5: Create Database

```bash
# Create Cloud SQL instance (takes 5-10 minutes)
gcloud sql instances create research-db \
  --database-version=POSTGRES_14 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --root-password="$(openssl rand -base64 20)"

# Create database
gcloud sql databases create research_system --instance=research-db

# Create user
gcloud sql users create research_user \
  --instance=research-db \
  --password="$(openssl rand -base64 20)"

# Get connection name (save this!)
gcloud sql instances describe research-db --format="value(connectionName)"
```

### Step 6: Clone and Deploy

```bash
# Clone repository
git clone https://github.com/Mr-mpange/google-research-project.git
cd google-research-project

# Deploy to Cloud Run (takes 5-10 minutes)
gcloud run deploy research-system \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --min-instances 0 \
  --max-instances 10 \
  --add-cloudsql-instances $(gcloud sql instances describe research-db --format="value(connectionName)") \
  --set-secrets="GEMINI_API_KEY=gemini-api-key:latest,AT_API_KEY=at-api-key:latest,JWT_SECRET=jwt-secret:latest,AT_USERNAME=at-username:latest" \
  --set-env-vars="NODE_ENV=production,DB_HOST=/cloudsql/$(gcloud sql instances describe research-db --format='value(connectionName)'),DB_NAME=research_system,DB_USER=research_user"
```

### Step 7: Get Your Service URL

```bash
# Get service URL
gcloud run services describe research-system \
  --region us-central1 \
  --format="value(status.url)"

# Test health endpoint
curl $(gcloud run services describe research-system --region us-central1 --format="value(status.url)")/health
```

### Step 8: Run Database Migrations

```bash
# Connect via Cloud SQL Proxy
cloud_sql_proxy -instances=$(gcloud sql instances describe research-db --format="value(connectionName)")=tcp:5432 &

# Run migrations
DB_HOST=localhost DB_PORT=5432 DB_NAME=research_system DB_USER=research_user npm run db:migrate
npm run db:seed
```

### Step 9: Configure Africa's Talking

1. Go to https://account.africastalking.com/
2. Navigate to USSD → My Codes
3. Set callback URL: `YOUR_CLOUD_RUN_URL/ussd/callback`
4. Navigate to Voice → Numbers
5. Set callback URL: `YOUR_CLOUD_RUN_URL/voice/callback`

### ✅ Done! Your app is live on Google Cloud Run!

---

## ⚡ Option 2: Quick Local Development

### Step 1: Clone Repository

```bash
git clone https://github.com/Mr-mpange/google-research-project.git
cd google-research-project
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Setup Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your credentials
# Windows:
notepad .env

# Mac/Linux:
nano .env
```

**Required environment variables:**
```env
# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Africa's Talking
AT_USERNAME=sandbox
AT_API_KEY=your_africastalking_api_key

# Database (SQLite for local dev)
DB_HOST=localhost
DB_NAME=research_system
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_random_secret_key

# Server
NODE_ENV=development
PORT=3000
```

### Step 4: Setup Database

**Option A: PostgreSQL (Recommended)**
```bash
# Install PostgreSQL
# Windows: Download from https://www.postgresql.org/download/windows/
# Mac: brew install postgresql
# Linux: sudo apt install postgresql

# Create database
psql -U postgres -c "CREATE DATABASE research_system;"

# Run migrations
npm run db:migrate

# Seed with sample data
npm run db:seed
```

**Option B: SQLite (Quick Start)**
```bash
# Just run migrations (SQLite auto-creates)
npm run db:migrate
npm run db:seed
```

### Step 5: Start Development Server

```bash
npm run dev
```

### Step 6: Test Locally

```bash
# Open browser
http://localhost:3000

# Test health endpoint
curl http://localhost:3000/health

# Test USSD (using Postman or curl)
curl -X POST http://localhost:3000/ussd/callback \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "sessionId=test123&serviceCode=*384*34153#&phoneNumber=%2B254712345678&text="
```

### ✅ Done! Your app is running locally!

---

## ⚡ Option 3: Docker Deployment

### Step 1: Install Docker

**Windows/Mac:**
- Download Docker Desktop: https://www.docker.com/products/docker-desktop

**Linux:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

### Step 2: Clone and Configure

```bash
# Clone repository
git clone https://github.com/Mr-mpange/google-research-project.git
cd google-research-project

# Create .env file
cp .env.example .env
# Edit .env with your credentials
```

### Step 3: Build and Run

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

### Step 4: Run Migrations

```bash
# Run migrations inside container
docker-compose exec app npm run db:migrate
docker-compose exec app npm run db:seed
```

### Step 5: Access Application

```bash
# Application running at
http://localhost:3000

# Test health
curl http://localhost:3000/health
```

### ✅ Done! Your app is running in Docker!

---

## 🧪 Testing Your Deployment

### Test 1: Health Check

```bash
# Cloud Run
curl YOUR_CLOUD_RUN_URL/health

# Local
curl http://localhost:3000/health

# Expected response:
# {"status":"healthy","timestamp":"2026-02-06T...","version":"1.0.0"}
```

### Test 2: USSD Simulation

```bash
# Test USSD main menu
curl -X POST YOUR_URL/ussd/callback \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "sessionId=test123&serviceCode=*384*34153#&phoneNumber=%2B254712345678&text="

# Expected response:
# CON Welcome to Research Information System
# 1. Research Information
# 2. Answer Research Questions
# ...
```

### Test 3: API Authentication

```bash
# Login to get JWT token
curl -X POST YOUR_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Expected response:
# {"success":true,"token":"eyJhbGc...","user":{...}}
```

### Test 4: Get Research Questions

```bash
# Use token from previous step
curl -X GET YOUR_URL/api/questions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Expected response:
# {"success":true,"questions":[...]}
```

---

## 📊 Verify AI Services

### Test Google Gemini AI

```bash
# Check AI service status
curl YOUR_URL/api/ai/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Expected response:
# {
#   "gemini": {"available": true, "model": "gemini-1.5-flash"},
#   "speech_to_text": "google"
# }
```

### Test Speech-to-Text (requires audio file)

```bash
# Upload and process audio
curl -X POST YOUR_URL/api/ai/transcribe \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "audio=@test-audio.wav"
```

---

## 🔧 Troubleshooting

### Issue: "gcloud: command not found"

**Solution:**
```bash
# Install Google Cloud SDK
# Visit: https://cloud.google.com/sdk/docs/install

# After installation, initialize
gcloud init
```

### Issue: "Permission denied" errors

**Solution:**
```bash
# Grant necessary permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="user:YOUR_EMAIL" \
  --role="roles/owner"
```

### Issue: Database connection failed

**Solution:**
```bash
# Check Cloud SQL instance status
gcloud sql instances describe research-db

# Restart instance if needed
gcloud sql instances restart research-db

# Check connection name
gcloud sql instances describe research-db --format="value(connectionName)"
```

### Issue: Secrets not found

**Solution:**
```bash
# List all secrets
gcloud secrets list

# Recreate missing secret
echo -n "YOUR_VALUE" | gcloud secrets create SECRET_NAME --data-file=-

# Grant access to Cloud Run service account
gcloud secrets add-iam-policy-binding SECRET_NAME \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Issue: Build fails on Cloud Run

**Solution:**
```bash
# Check build logs
gcloud builds list --limit=5

# View specific build
gcloud builds log BUILD_ID

# Common fixes:
# 1. Check Dockerfile syntax
# 2. Ensure package.json is valid
# 3. Check for missing dependencies
```

### Issue: App crashes on startup

**Solution:**
```bash
# View Cloud Run logs
gcloud run services logs read research-system --region us-central1 --limit 100

# Common issues:
# 1. Missing environment variables
# 2. Database connection failed
# 3. Port mismatch (must use PORT env var)
```

---

## 📱 Configure Africa's Talking

### USSD Setup

1. Login to https://account.africastalking.com/
2. Go to **USSD → My Codes**
3. Click **Create Channel**
4. Enter your USSD code (e.g., `*384*34153#`)
5. Set **Callback URL**: `YOUR_CLOUD_RUN_URL/ussd/callback`
6. Click **Save**

### Voice Setup

1. Go to **Voice → Numbers**
2. Click on your phone number
3. Set **Callback URL**: `YOUR_CLOUD_RUN_URL/voice/callback`
4. Click **Save**

### SMS Setup

1. Go to **SMS → Settings**
2. Set **Delivery Reports URL**: `YOUR_CLOUD_RUN_URL/sms/delivery-report`
3. Click **Save**

### Test in Sandbox

```bash
# Test USSD
# Dial your USSD code from the sandbox phone number

# Test Voice
# Call your voice number from the sandbox

# Test SMS
curl -X POST YOUR_URL/sms/thank-you \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"+254712345678","language":"en","questionTitle":"Test"}'
```

---

## 🎯 Next Steps

### 1. Customize Your Research Questions

```bash
# Login to dashboard
http://YOUR_URL/dashboard

# Or use API
curl -X POST YOUR_URL/api/questions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Your Question Title",
    "question_text": "Your question here?",
    "category": "health",
    "language": "en"
  }'
```

### 2. Monitor Your Application

```bash
# View Cloud Run metrics
gcloud run services describe research-system --region us-central1

# View logs in real-time
gcloud run services logs tail research-system --region us-central1

# Open Cloud Console
https://console.cloud.google.com/run
```

### 3. Set Up Alerts

```bash
# Create alert for high error rate
gcloud alpha monitoring policies create \
  --notification-channels=YOUR_CHANNEL_ID \
  --display-name="High Error Rate" \
  --condition-display-name="Error rate > 5%"
```

### 4. Backup Your Data

```bash
# Backup database
gcloud sql export sql research-db gs://YOUR_BUCKET/backup-$(date +%Y%m%d).sql \
  --database=research_system

# Schedule daily backups
gcloud sql instances patch research-db \
  --backup-start-time=02:00
```

---

## 💰 Cost Estimate

### Google Cloud (Monthly)

| Service | Free Tier | Paid (Moderate Use) |
|---------|-----------|---------------------|
| Cloud Run | 2M requests free | $5-20 |
| Cloud SQL | - | $7.67 |
| Cloud Storage | 5GB free | $1-5 |
| Gemini AI | Free tier available | $0-10 |
| Speech-to-Text | 60 min free | $0-15 |
| **Total** | **~$0-10** | **$15-60** |

### Africa's Talking (Per Transaction)

| Service | Sandbox | Production |
|---------|---------|------------|
| USSD | Free | ~$0.002/session |
| Voice | Free | ~$0.05/minute |
| SMS | Free | ~$0.01/SMS |

---

## 📚 Useful Commands Reference

### Google Cloud

```bash
# List all projects
gcloud projects list

# Switch project
gcloud config set project PROJECT_ID

# List Cloud Run services
gcloud run services list

# Update service
gcloud run services update research-system --region us-central1

# Delete service
gcloud run services delete research-system --region us-central1

# View quotas
gcloud compute project-info describe --project=PROJECT_ID
```

### Docker

```bash
# Build image
docker build -t research-system .

# Run container
docker run -p 3000:3000 --env-file .env research-system

# Stop all containers
docker-compose down

# Remove all containers and volumes
docker-compose down -v

# View logs
docker-compose logs -f app
```

### Database

```bash
# Connect to Cloud SQL
gcloud sql connect research-db --user=research_user

# Export database
gcloud sql export sql research-db gs://bucket/backup.sql --database=research_system

# Import database
gcloud sql import sql research-db gs://bucket/backup.sql --database=research_system

# Local PostgreSQL
psql -U postgres -d research_system
```

### NPM Scripts

```bash
# Development
npm run dev              # Start dev server with nodemon
npm run start            # Start production server

# Database
npm run db:migrate       # Run migrations
npm run db:seed          # Seed database
npm run db:reset         # Reset database (migrate + seed)

# Testing
npm test                 # Run tests
npm run test:coverage    # Run with coverage

# Deployment
npm run deploy           # Deploy with PM2
npm run docker:build     # Build Docker image
npm run docker:run       # Run with Docker Compose
```

---

## ✅ Deployment Checklist

- [ ] Google Cloud project created
- [ ] APIs enabled (Run, Build, SQL, Storage, Speech, Secrets)
- [ ] Secrets stored (Gemini API, AT API, JWT)
- [ ] Cloud SQL instance created
- [ ] Database created and migrated
- [ ] Application deployed to Cloud Run
- [ ] Service URL obtained
- [ ] Health check passing
- [ ] Africa's Talking webhooks configured
- [ ] USSD tested
- [ ] Voice tested
- [ ] SMS tested
- [ ] Monitoring enabled
- [ ] Backups configured

---

## 🎉 Success!

Your AI-Powered Research Data Collection System is now live!

**Service URL:** [Your Cloud Run URL]

**Next:** Submit to hackathon at https://bit.ly/capstone-BWAI

---

## 📞 Need Help?

- **Documentation:** Check `/docs` folder
- **Issues:** https://github.com/Mr-mpange/google-research-project/issues
- **Google Cloud Support:** https://cloud.google.com/support
- **Africa's Talking Support:** https://help.africastalking.com/

---

**🌍 Built for African Researchers | 🤖 Powered by Google AI | 🚀 Deployed on Cloud Run**
