#!/bin/bash

echo "========================================="
echo "Deploying User Management to Cloud Run"
echo "========================================="
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Please install Google Cloud SDK."
    exit 1
fi

# Set project
PROJECT_ID="trans-campus-480505-i2"
SERVICE_NAME="research-system"
REGION="us-central1"

echo "📦 Project: $PROJECT_ID"
echo "🚀 Service: $SERVICE_NAME"
echo "🌍 Region: $REGION"
echo ""

# Confirm deployment
read -p "Deploy to Cloud Run? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Deployment cancelled"
    exit 0
fi

echo ""
echo "🔨 Building and deploying..."
echo ""

# Deploy to Cloud Run
gcloud run deploy $SERVICE_NAME \
  --source . \
  --platform managed \
  --region $REGION \
  --project $PROJECT_ID \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --min-instances 0 \
  --max-instances 10

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================="
    echo "✅ Deployment Successful!"
    echo "========================================="
    echo ""
    echo "🌐 Service URL:"
    gcloud run services describe $SERVICE_NAME \
      --region $REGION \
      --project $PROJECT_ID \
      --format="value(status.url)"
    echo ""
    echo "📝 New API Endpoints Available:"
    echo "  GET    /api/users - List all users"
    echo "  PATCH  /api/users/:id/status - Activate/Deactivate"
    echo "  PATCH  /api/users/:id/role - Change role"
    echo "  DELETE /api/users/:id - Delete user"
    echo ""
    echo "🎉 User Management is now live!"
else
    echo ""
    echo "❌ Deployment failed"
    exit 1
fi
