# 🔧 Managing Environment Variables in Google Cloud Run

## Quick Reference

### View Current Variables

```bash
# View all environment variables
gcloud run services describe research-system --region us-central1 --format="value(spec.template.spec.containers[0].env)"

# View in table format
gcloud run services describe research-system --region us-central1 --format="table(spec.template.spec.containers[0].env)"
```

---

## Method 1: Command Line (Recommended)

### Add or Update Single Variable

```bash
gcloud run services update research-system \
  --region us-central1 \
  --update-env-vars="VARIABLE_NAME=value"
```

**Examples:**

```bash
# Add database host
gcloud run services update research-system \
  --region us-central1 \
  --update-env-vars="DB_HOST=localhost"

# Update port
gcloud run services update research-system \
  --region us-central1 \
  --update-env-vars="PORT=8080"

# Add organization name
gcloud run services update research-system \
  --region us-central1 \
  --update-env-vars="ORGANIZATION_NAME=My Research Org"
```

### Add or Update Multiple Variables

```bash
gcloud run services update research-system \
  --region us-central1 \
  --update-env-vars="VAR1=value1,VAR2=value2,VAR3=value3"
```

**Example:**

```bash
gcloud run services update research-system \
  --region us-central1 \
  --update-env-vars="DB_HOST=localhost,DB_NAME=research_system,DB_USER=postgres"
```

### Remove Variable

```bash
gcloud run services update research-system \
  --region us-central1 \
  --remove-env-vars="VARIABLE_NAME"
```

**Example:**

```bash
gcloud run services update research-system \
  --region us-central1 \
  --remove-env-vars="OLD_VARIABLE"
```

### Clear All Variables (except secrets)

```bash
gcloud run services update research-system \
  --region us-central1 \
  --clear-env-vars
```

---

## Method 2: Update Secrets (API Keys)

Secrets are stored in Secret Manager and referenced by Cloud Run.

### Update Gemini API Key

```bash
# Add new version
echo "YOUR_NEW_GEMINI_KEY" | gcloud secrets versions add gemini-api-key --data-file=-

# Cloud Run automatically uses the latest version
```

### Update Africa's Talking API Key

```bash
echo "YOUR_NEW_AT_KEY" | gcloud secrets versions add at-api-key --data-file=-
```

### Update Africa's Talking Username

```bash
echo "YOUR_NEW_USERNAME" | gcloud secrets versions add at-username --data-file=-
```

### Update JWT Secret

```bash
# Generate new random secret
echo "$(openssl rand -base64 32)" | gcloud secrets versions add jwt-secret --data-file=-

# Or use your own
echo "YOUR_JWT_SECRET" | gcloud secrets versions add jwt-secret --data-file=-
```

**Note:** Secrets are updated immediately without redeploying!

---

## Method 3: Cloud Console (Web UI)

### Steps:

1. Go to: https://console.cloud.google.com/run?project=trans-campus-480505-i2

2. Click on **research-system** service

3. Click **EDIT & DEPLOY NEW REVISION**

4. Scroll to **Variables & Secrets** section

5. Click **+ ADD VARIABLE** or **+ REFERENCE A SECRET**

6. Enter variable name and value

7. Click **DEPLOY**

---

## Method 4: Using Interactive Script

Run the interactive script:

```powershell
.\update-env.ps1
```

This script provides a menu to:
- Add/update single variable
- Add/update multiple variables
- Remove variables
- Update secrets

---

## Common Environment Variables

### Required Variables

```bash
NODE_ENV=production              # Environment mode
```

### Database Variables (if using Cloud SQL)

```bash
DB_HOST=/cloudsql/CONNECTION_NAME  # Cloud SQL connection
DB_NAME=research_system            # Database name
DB_USER=research_user              # Database user
DB_PASSWORD=password               # Database password (use secret!)
```

### Application Variables

```bash
PORT=8080                          # Port (Cloud Run uses 8080)
LOG_LEVEL=info                     # Logging level
ORGANIZATION_NAME=My Org           # Organization name
CONTACT_EMAIL=contact@org.com      # Contact email
USSD_CODE=*384*34153#             # USSD code
```

### AI Configuration

```bash
GEMINI_MODEL=gemini-1.5-flash     # Gemini model
AI_CONFIDENCE_THRESHOLD=0.7        # AI confidence threshold
SUMMARY_MAX_LENGTH=500             # Max summary length
```

---

## Example: Complete Environment Setup

```bash
gcloud run services update research-system \
  --region us-central1 \
  --update-env-vars="NODE_ENV=production,PORT=8080,LOG_LEVEL=info,ORGANIZATION_NAME=Research Initiative,CONTACT_EMAIL=research@org.com,USSD_CODE=*384*34153#,GEMINI_MODEL=gemini-1.5-flash,AI_CONFIDENCE_THRESHOLD=0.7,SUMMARY_MAX_LENGTH=500"
```

---

## Verify Changes

### View Updated Variables

```bash
gcloud run services describe research-system --region us-central1
```

### Test Application

```bash
curl https://research-system-864580156744.us-central1.run.app/health
```

### View Logs

```bash
gcloud run services logs read research-system --region us-central1 --limit 50
```

---

## Best Practices

### 1. Use Secrets for Sensitive Data

❌ **Don't do this:**
```bash
--update-env-vars="API_KEY=sk-1234567890"
```

✅ **Do this:**
```bash
# Store in Secret Manager
echo "sk-1234567890" | gcloud secrets create my-api-key --data-file=-

# Reference in Cloud Run
--set-secrets="API_KEY=my-api-key:latest"
```

### 2. Group Related Variables

```bash
# Database variables together
--update-env-vars="DB_HOST=localhost,DB_NAME=research_system,DB_USER=postgres"

# AI variables together
--update-env-vars="GEMINI_MODEL=gemini-1.5-flash,AI_CONFIDENCE_THRESHOLD=0.7"
```

### 3. Use Descriptive Names

✅ Good:
```bash
ORGANIZATION_NAME=Research Initiative
CONTACT_EMAIL=research@org.com
```

❌ Bad:
```bash
ORG=Research Initiative
EMAIL=research@org.com
```

### 4. Document Your Variables

Keep a list of all environment variables in your `.env.example` file.

---

## Troubleshooting

### Variable Not Taking Effect

**Solution:** Redeploy the service
```bash
gcloud run services update research-system --region us-central1
```

### Secret Not Found

**Solution:** Check if secret exists
```bash
gcloud secrets list
```

Create if missing:
```bash
echo "VALUE" | gcloud secrets create SECRET_NAME --data-file=-
```

### Permission Denied on Secret

**Solution:** Grant access to Cloud Run service account
```bash
gcloud secrets add-iam-policy-binding SECRET_NAME \
  --member="serviceAccount:864580156744-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Quick Commands Cheat Sheet

```bash
# View all variables
gcloud run services describe research-system --region us-central1

# Add variable
gcloud run services update research-system --region us-central1 --update-env-vars="VAR=value"

# Remove variable
gcloud run services update research-system --region us-central1 --remove-env-vars="VAR"

# Update secret
echo "NEW_VALUE" | gcloud secrets versions add SECRET_NAME --data-file=-

# View secrets
gcloud secrets list

# View secret versions
gcloud secrets versions list SECRET_NAME

# Test deployment
curl https://research-system-864580156744.us-central1.run.app/health

# View logs
gcloud run services logs tail research-system --region us-central1
```

---

## Your Current Configuration

**Service:** research-system  
**Region:** us-central1  
**Project:** trans-campus-480505-i2  
**URL:** https://research-system-864580156744.us-central1.run.app

**Current Variables:**
- `NODE_ENV=production`

**Current Secrets:**
- `GEMINI_API_KEY` → gemini-api-key:latest
- `AT_API_KEY` → at-api-key:latest
- `JWT_SECRET` → jwt-secret:latest
- `AT_USERNAME` → at-username:latest

---

## Need Help?

Run the interactive script:
```powershell
.\update-env.ps1
```

Or view Cloud Console:
https://console.cloud.google.com/run/detail/us-central1/research-system?project=trans-campus-480505-i2
