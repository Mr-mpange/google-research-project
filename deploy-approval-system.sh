#!/bin/bash

# Deploy Approval System and Projects
# This script runs the SQL migration and deploys the updated backend

echo "=== Deploying Approval System & Projects ==="
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Please install it first."
    exit 1
fi

# Set project
PROJECT_ID="trans-campus-480505-i2"
echo "📋 Using project: $PROJECT_ID"
gcloud config set project $PROJECT_ID

# Run SQL migration
echo ""
echo "📊 Running database migration..."
echo "Please run this SQL in Cloud SQL:"
echo ""
cat src/database/add-approval-system.sql
echo ""
read -p "Have you run the SQL migration? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Please run the SQL migration first, then run this script again."
    exit 1
fi

# Deploy to Cloud Run
echo ""
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy research-system \
  --source . \
  --region=us-central1 \
  --allow-unauthenticated \
  --project=$PROJECT_ID

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "📝 Summary of changes:"
    echo "  - Added user approval system (pending/active/inactive/rejected)"
    echo "  - New researchers require admin approval"
    echo "  - Added research_projects table"
    echo "  - Added approval/rejection endpoints"
    echo ""
    echo "🔗 API Endpoints added:"
    echo "  - GET  /api/users/pending/list - Get pending users"
    echo "  - POST /api/users/:userId/approve - Approve user"
    echo "  - POST /api/users/:userId/reject - Reject user"
    echo ""
else
    echo ""
    echo "❌ Deployment failed!"
    exit 1
fi
