#!/bin/bash

# 🚀 One-Click Deployment Script for Google Cloud Run
# This script automates the entire deployment process

set -e  # Exit on error

echo "🚀 Starting deployment to Google Cloud Run..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    print_error "Google Cloud SDK not found. Please install it first:"
    echo "Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

print_success "Google Cloud SDK found"

# Get project ID
print_info "Enter your Google Cloud Project ID:"
read -r PROJECT_ID

if [ -z "$PROJECT_ID" ]; then
    print_error "Project ID cannot be empty"
    exit 1
fi

# Set project
print_info "Setting project to $PROJECT_ID..."
gcloud config set project "$PROJECT_ID"
print_success "Project set"

# Enable required APIs
print_info "Enabling required APIs (this may take 2-3 minutes)..."
gcloud services enable run.googleapis.com \
    cloudbuild.googleapis.com \
    sqladmin.googleapis.com \
    storage.googleapis.com \
    speech.googleapis.com \
    secretmanager.googleapis.com
print_success "APIs enabled"

# Get API keys
print_info "Enter your Google Gemini API Key:"
read -r GEMINI_API_KEY

print_info "Enter your Africa's Talking API Key:"
read -r AT_API_KEY

print_info "Enter your Africa's Talking Username (default: sandbox):"
read -r AT_USERNAME
AT_USERNAME=${AT_USERNAME:-sandbox}

# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 32)
print_success "Generated JWT secret"

# Store secrets
print_info "Storing secrets in Secret Manager..."
echo -n "$GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=- 2>/dev/null || \
    echo -n "$GEMINI_API_KEY" | gcloud secrets versions add gemini-api-key --data-file=-

echo -n "$AT_API_KEY" | gcloud secrets create at-api-key --data-file=- 2>/dev/null || \
    echo -n "$AT_API_KEY" | gcloud secrets versions add at-api-key --data-file=-

echo -n "$AT_USERNAME" | gcloud secrets create at-username --data-file=- 2>/dev/null || \
    echo -n "$AT_USERNAME" | gcloud secrets versions add at-username --data-file=-

echo -n "$JWT_SECRET" | gcloud secrets create jwt-secret --data-file=- 2>/dev/null || \
    echo -n "$JWT_SECRET" | gcloud secrets versions add jwt-secret --data-file=-

print_success "Secrets stored"

# Ask if user wants to create Cloud SQL instance
print_info "Do you want to create a Cloud SQL instance? (y/n)"
read -r CREATE_DB

if [ "$CREATE_DB" = "y" ]; then
    print_info "Creating Cloud SQL instance (this takes 5-10 minutes)..."
    
    DB_PASSWORD=$(openssl rand -base64 20)
    
    gcloud sql instances create research-db \
        --database-version=POSTGRES_14 \
        --tier=db-f1-micro \
        --region=us-central1 \
        --root-password="$DB_PASSWORD" 2>/dev/null || print_info "Instance already exists"
    
    gcloud sql databases create research_system --instance=research-db 2>/dev/null || print_info "Database already exists"
    
    gcloud sql users create research_user \
        --instance=research-db \
        --password="$DB_PASSWORD" 2>/dev/null || print_info "User already exists"
    
    CONNECTION_NAME=$(gcloud sql instances describe research-db --format="value(connectionName)")
    print_success "Cloud SQL instance created: $CONNECTION_NAME"
    
    CLOUDSQL_ARG="--add-cloudsql-instances $CONNECTION_NAME"
    DB_ENV="DB_HOST=/cloudsql/$CONNECTION_NAME,DB_NAME=research_system,DB_USER=research_user"
else
    print_info "Skipping Cloud SQL creation"
    CLOUDSQL_ARG=""
    DB_ENV="DB_HOST=localhost,DB_NAME=research_system"
fi

# Deploy to Cloud Run
print_info "Deploying to Cloud Run (this takes 5-10 minutes)..."

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
    $CLOUDSQL_ARG \
    --set-secrets="GEMINI_API_KEY=gemini-api-key:latest,AT_API_KEY=at-api-key:latest,JWT_SECRET=jwt-secret:latest,AT_USERNAME=at-username:latest" \
    --set-env-vars="NODE_ENV=production,$DB_ENV"

print_success "Deployment complete!"

# Get service URL
SERVICE_URL=$(gcloud run services describe research-system --region us-central1 --format="value(status.url)")

echo ""
echo "=========================================="
echo "🎉 Deployment Successful!"
echo "=========================================="
echo ""
echo "Service URL: $SERVICE_URL"
echo ""
echo "Test your deployment:"
echo "  curl $SERVICE_URL/health"
echo ""
echo "Configure Africa's Talking webhooks:"
echo "  USSD: $SERVICE_URL/ussd/callback"
echo "  Voice: $SERVICE_URL/voice/callback"
echo "  SMS: $SERVICE_URL/sms/delivery-report"
echo ""
echo "View logs:"
echo "  gcloud run services logs tail research-system --region us-central1"
echo ""
echo "=========================================="
echo ""

# Test health endpoint
print_info "Testing health endpoint..."
if curl -s "$SERVICE_URL/health" | grep -q "healthy"; then
    print_success "Health check passed!"
else
    print_error "Health check failed. Check logs for details."
fi

echo ""
print_success "All done! Your application is live at: $SERVICE_URL"
