# ☁️ Google Cloud Run Deployment Guide

## Overview

This guide walks you through deploying the AI-Powered Research Data Collection System to Google Cloud Run, earning you bonus points for the hackathon! 🎉

---

## 🚀 Quick Deploy (From Google Colab)

### Option 1: One-Click Deploy from Colab

```python
# Run this in Google Colab
!git clone https://github.com/Mr-mpange/google-research-project.git
%cd google-research-project

# Authenticate with Google Cloud
from google.colab import auth
auth.authenticate_user()

# Set your project ID
PROJECT_ID = "your-project-id"
!gcloud config set project {PROJECT_ID}

# Deploy to Cloud Run (Colab provides easy deployment prompt)
!gcloud run deploy research-system \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --set-env-vars="NODE_ENV=production"
```

### Option 2: Deploy from Local Machine

```bash
# 1. Clone repository
git clone https://github.com/Mr-mpange/google-research-project.git
cd google-research-project

# 2. Install Google Cloud SDK (if not already installed)
# Visit: https://cloud.google.com/sdk/docs/install

# 3. Authenticate
gcloud auth login

# 4. Set project
gcloud config set project YOUR_PROJECT_ID

# 5. Deploy
gcloud run deploy research-system \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

---

## 📋 Prerequisites

### 1. Google Cloud Account
- Create account at https://cloud.google.com
- Enable billing (free tier available)
- $300 free credit for new users

### 2. Required APIs
Enable these APIs in your Google Cloud Console:

```bash
# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable speech.googleapis.com
gcloud services enable generativelanguage.googleapis.com
```

### 3. Service Account Setup

```bash
# Create service account
gcloud iam service-accounts create research-system-sa \
  --display-name="Research System Service Account"

# Grant necessary permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:research-system-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.invoker"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:research-system-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/speech.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:research-system-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# Create and download key
gcloud iam service-accounts keys create credentials/google-credentials.json \
  --iam-account=research-system-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

---

## 🗄️ Database Setup (Cloud SQL)

### Create PostgreSQL Instance

```bash
# Create Cloud SQL instance
gcloud sql instances create research-db \
  --database-version=POSTGRES_14 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --root-password=YOUR_SECURE_PASSWORD \
  --storage-type=SSD \
  --storage-size=10GB

# Create database
gcloud sql databases create research_system \
  --instance=research-db

# Create user
gcloud sql users create research_user \
  --instance=research-db \
  --password=YOUR_USER_PASSWORD
```

### Connect Cloud Run to Cloud SQL

```bash
# Get connection name
gcloud sql instances describe research-db --format="value(connectionName)"
# Output: YOUR_PROJECT_ID:us-central1:research-db

# Deploy with Cloud SQL connection
gcloud run deploy research-system \
  --source . \
  --add-cloudsql-instances YOUR_PROJECT_ID:us-central1:research-db \
  --set-env-vars="DB_HOST=/cloudsql/YOUR_PROJECT_ID:us-central1:research-db,DB_NAME=research_system,DB_USER=research_user,DB_PASSWORD=YOUR_USER_PASSWORD"
```

---

## 📦 Storage Setup (Cloud Storage)

### Create Storage Bucket

```bash
# Create bucket for audio files
gsutil mb -l us-central1 gs://YOUR_PROJECT_ID-research-audio

# Set lifecycle policy (auto-delete after 90 days)
cat > lifecycle.json << EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 90}
      }
    ]
  }
}
EOF

gsutil lifecycle set lifecycle.json gs://YOUR_PROJECT_ID-research-audio

# Set CORS for audio access
cat > cors.json << EOF
[
  {
    "origin": ["*"],
    "method": ["GET"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
EOF

gsutil cors set cors.json gs://YOUR_PROJECT_ID-research-audio
```

---

## 🔐 Secrets Management

### Store Secrets in Secret Manager

```bash
# Enable Secret Manager API
gcloud services enable secretmanager.googleapis.com

# Create secrets
echo -n "your_gemini_api_key" | gcloud secrets create gemini-api-key --data-file=-
echo -n "your_africastalking_api_key" | gcloud secrets create at-api-key --data-file=-
echo -n "your_jwt_secret" | gcloud secrets create jwt-secret --data-file=-

# Grant access to service account
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:research-system-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding at-api-key \
  --member="serviceAccount:research-system-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding jwt-secret \
  --member="serviceAccount:research-system-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 🚀 Deployment

### Complete Deployment Command

```bash
gcloud run deploy research-system \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --service-account research-system-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --add-cloudsql-instances YOUR_PROJECT_ID:us-central1:research-db \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --min-instances 0 \
  --max-instances 10 \
  --concurrency 80 \
  --set-env-vars="NODE_ENV=production,PORT=8080" \
  --set-secrets="GEMINI_API_KEY=gemini-api-key:latest,AT_API_KEY=at-api-key:latest,JWT_SECRET=jwt-secret:latest" \
  --set-env-vars="DB_HOST=/cloudsql/YOUR_PROJECT_ID:us-central1:research-db,DB_NAME=research_system,DB_USER=research_user,DB_PASSWORD=YOUR_USER_PASSWORD,GOOGLE_PROJECT_ID=YOUR_PROJECT_ID,STORAGE_BUCKET=YOUR_PROJECT_ID-research-audio"
```

### Verify Deployment

```bash
# Get service URL
gcloud run services describe research-system \
  --region us-central1 \
  --format="value(status.url)"

# Test health endpoint
curl https://YOUR_SERVICE_URL/health
```

---

## 🔄 Database Migration

### Run Migrations on Cloud Run

```bash
# Option 1: Run migration job
gcloud run jobs create research-migrate \
  --image gcr.io/YOUR_PROJECT_ID/research-system \
  --region us-central1 \
  --add-cloudsql-instances YOUR_PROJECT_ID:us-central1:research-db \
  --set-env-vars="DB_HOST=/cloudsql/YOUR_PROJECT_ID:us-central1:research-db" \
  --command="npm" \
  --args="run,db:migrate"

gcloud run jobs execute research-migrate --region us-central1

# Option 2: Connect via Cloud SQL Proxy locally
cloud_sql_proxy -instances=YOUR_PROJECT_ID:us-central1:research-db=tcp:5432 &
npm run db:migrate
npm run db:seed
```

---

## 🌐 Custom Domain Setup

### Map Custom Domain

```bash
# Verify domain ownership in Google Search Console first

# Map domain
gcloud run domain-mappings create \
  --service research-system \
  --domain api.yourdomain.com \
  --region us-central1

# Get DNS records to configure
gcloud run domain-mappings describe \
  --domain api.yourdomain.com \
  --region us-central1
```

---

## 📊 Monitoring & Logging

### Enable Cloud Monitoring

```bash
# View logs
gcloud run services logs read research-system \
  --region us-central1 \
  --limit 50

# Stream logs
gcloud run services logs tail research-system \
  --region us-central1

# View metrics in Cloud Console
# https://console.cloud.google.com/run/detail/us-central1/research-system/metrics
```

### Set Up Alerts

```bash
# Create alert policy for high error rate
gcloud alpha monitoring policies create \
  --notification-channels=YOUR_CHANNEL_ID \
  --display-name="High Error Rate" \
  --condition-display-name="Error rate > 5%" \
  --condition-threshold-value=0.05 \
  --condition-threshold-duration=300s
```

---

## 💰 Cost Optimization

### Pricing Estimates

**Cloud Run:**
- First 2 million requests/month: FREE
- CPU: $0.00002400/vCPU-second
- Memory: $0.00000250/GiB-second
- Estimated: $5-20/month for moderate usage

**Cloud SQL (db-f1-micro):**
- $7.67/month (always-on)
- Storage: $0.17/GB/month

**Cloud Storage:**
- $0.020/GB/month
- Estimated: $1-5/month

**Total Estimated Cost:** $15-35/month

### Cost Reduction Tips

```bash
# Set minimum instances to 0 (scale to zero)
gcloud run services update research-system \
  --region us-central1 \
  --min-instances 0

# Use Cloud SQL on-demand (stop when not in use)
gcloud sql instances patch research-db --activation-policy=NEVER

# Set storage lifecycle policies
# (Already configured above - auto-delete after 90 days)
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Build Fails

```bash
# Check build logs
gcloud builds list --limit=5

# View specific build
gcloud builds log BUILD_ID
```

#### 2. Service Won't Start

```bash
# Check service logs
gcloud run services logs read research-system --region us-central1 --limit 100

# Common issues:
# - Missing environment variables
# - Database connection failed
# - Port mismatch (must use PORT=8080)
```

#### 3. Database Connection Issues

```bash
# Test connection with Cloud SQL Proxy
cloud_sql_proxy -instances=YOUR_PROJECT_ID:us-central1:research-db=tcp:5432

# Connect with psql
psql "host=127.0.0.1 port=5432 dbname=research_system user=research_user"
```

#### 4. Permission Errors

```bash
# Check service account permissions
gcloud projects get-iam-policy YOUR_PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:research-system-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com"
```

---

## 🔄 CI/CD Setup

### GitHub Actions Deployment

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches:
      - main

env:
  PROJECT_ID: your-project-id
  SERVICE_NAME: research-system
  REGION: us-central1

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
    
    - name: Authenticate to Google Cloud
      uses: google-github-actions/auth@v1
      with:
        credentials_json: ${{ secrets.GCP_SA_KEY }}
    
    - name: Set up Cloud SDK
      uses: google-github-actions/setup-gcloud@v1
    
    - name: Deploy to Cloud Run
      run: |
        gcloud run deploy $SERVICE_NAME \
          --source . \
          --platform managed \
          --region $REGION \
          --allow-unauthenticated
```

---

## 📱 Configure Africa's Talking Webhooks

After deployment, update your Africa's Talking dashboard:

### USSD Callback URL
```
https://YOUR_SERVICE_URL/ussd/callback
```

### Voice Callback URL
```
https://YOUR_SERVICE_URL/voice/callback
```

### SMS Delivery Report URL
```
https://YOUR_SERVICE_URL/sms/delivery-report
```

---

## ✅ Post-Deployment Checklist

- [ ] Service deployed successfully
- [ ] Health check endpoint responding
- [ ] Database connected and migrated
- [ ] Secrets configured in Secret Manager
- [ ] Storage bucket created and accessible
- [ ] Custom domain mapped (optional)
- [ ] Monitoring and alerts set up
- [ ] Africa's Talking webhooks configured
- [ ] SSL certificate active (automatic with Cloud Run)
- [ ] Cost alerts configured
- [ ] Backup strategy implemented

---

## 🎉 Success!

Your application is now running on Google Cloud Run! 

**Service URL:** https://research-system-XXXXX-uc.a.run.app

Test it:
```bash
curl https://YOUR_SERVICE_URL/health
```

---

## 📚 Additional Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud SQL Documentation](https://cloud.google.com/sql/docs)
- [Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [Cloud Storage Documentation](https://cloud.google.com/storage/docs)
- [Google Colab Cloud Run Tutorial](https://cloud.google.com/run/docs/quickstarts/deploy-container)

---

**Need Help?**
- GitHub Issues: https://github.com/Mr-mpange/google-research-project/issues
- Google Cloud Support: https://cloud.google.com/support

**Deployed with ❤️ on Google Cloud Run**
