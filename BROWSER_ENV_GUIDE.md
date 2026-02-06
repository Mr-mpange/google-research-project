# 🌐 Update Environment Variables in Browser (Google Cloud Console)

## Step-by-Step Guide with Screenshots

### Step 1: Open Google Cloud Console

**Go to:** https://console.cloud.google.com/run?project=trans-campus-480505-i2

Or manually:
1. Go to https://console.cloud.google.com
2. Select project: **trans-campus-480505-i2**
3. Click hamburger menu (☰) → **Cloud Run**

---

### Step 2: Select Your Service

1. You'll see a list of Cloud Run services
2. Click on **research-system**

**Direct Link:** https://console.cloud.google.com/run/detail/us-central1/research-system?project=trans-campus-480505-i2

---

### Step 3: Edit & Deploy New Revision

1. At the top of the page, click the **EDIT & DEPLOY NEW REVISION** button
2. This opens the deployment configuration page

---

### Step 4: Navigate to Variables & Secrets

Scroll down to find the **Variables & Secrets** section. You'll see:

- **Environment variables** tab
- **Secrets** tab
- **Cloud SQL connections** tab

---

### Step 5: Add/Edit Environment Variables

#### To Add a New Variable:

1. Click **+ ADD VARIABLE** button
2. Enter **Name** (e.g., `DB_HOST`)
3. Enter **Value** (e.g., `localhost`)
4. Click outside the field or press Tab

#### To Edit Existing Variable:

1. Find the variable in the list
2. Click on the **Value** field
3. Edit the value
4. Click outside the field

#### To Remove a Variable:

1. Find the variable in the list
2. Click the **trash icon** (🗑️) on the right
3. Confirm deletion

---

### Step 6: Add/Edit Secrets (API Keys)

#### To Reference a Secret:

1. Click the **Secrets** tab
2. Click **+ REFERENCE A SECRET**
3. Select secret from dropdown (e.g., `gemini-api-key`)
4. Choose **Expose as environment variable**
5. Enter variable name (e.g., `GEMINI_API_KEY`)
6. Select version: **latest**
7. Click **DONE**

#### To Update a Secret Value:

**Note:** You can't edit secret values directly in Cloud Run. You need to:

1. Go to Secret Manager: https://console.cloud.google.com/security/secret-manager?project=trans-campus-480505-i2
2. Click on the secret name (e.g., `gemini-api-key`)
3. Click **+ NEW VERSION**
4. Enter new secret value
5. Click **ADD NEW VERSION**
6. Cloud Run will automatically use the latest version

---

### Step 7: Deploy Changes

1. Scroll to the bottom of the page
2. Click the blue **DEPLOY** button
3. Wait 2-5 minutes for deployment to complete
4. You'll see "Service deployed successfully" message

---

## Common Environment Variables to Add

### Database Configuration

| Name | Value | Description |
|------|-------|-------------|
| `DB_HOST` | `localhost` | Database host |
| `DB_NAME` | `research_system` | Database name |
| `DB_USER` | `postgres` | Database user |
| `DB_PORT` | `5432` | Database port |

### Application Configuration

| Name | Value | Description |
|------|-------|-------------|
| `PORT` | `8080` | Application port (Cloud Run default) |
| `NODE_ENV` | `production` | Environment mode |
| `LOG_LEVEL` | `info` | Logging level |

### Organization Details

| Name | Value | Description |
|------|-------|-------------|
| `ORGANIZATION_NAME` | `Your Organization` | Organization name |
| `CONTACT_EMAIL` | `contact@org.com` | Contact email |
| `CONTACT_PHONE` | `+254700000000` | Contact phone |

### USSD Configuration

| Name | Value | Description |
|------|-------|-------------|
| `USSD_CODE` | `*384*34153#` | Your USSD code |
| `USSD_SERVICE_CODE` | `384*34153` | Service code |

### AI Configuration

| Name | Value | Description |
|------|-------|-------------|
| `GEMINI_MODEL` | `gemini-1.5-flash` | Gemini AI model |
| `AI_CONFIDENCE_THRESHOLD` | `0.7` | AI confidence threshold |
| `SUMMARY_MAX_LENGTH` | `500` | Max summary length |

---

## Visual Guide

### 1. Cloud Run Services List
```
┌─────────────────────────────────────────────────────┐
│ Cloud Run                                           │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ research-system                              │   │
│ │ Region: us-central1                          │   │
│ │ URL: https://research-system-...run.app      │   │
│ │ [EDIT & DEPLOY NEW REVISION]                 │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 2. Edit & Deploy Page
```
┌─────────────────────────────────────────────────────┐
│ Edit research-system                                │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Container                                           │
│ ┌─────────────────────────────────────────────┐   │
│ │ Container image URL                          │   │
│ │ gcr.io/trans-campus-480505-i2/...           │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ Variables & Secrets                                 │
│ ┌─────────────────────────────────────────────┐   │
│ │ [Environment variables] [Secrets]            │   │
│ │                                              │   │
│ │ Name              Value                      │   │
│ │ NODE_ENV          production                 │   │
│ │                                              │   │
│ │ [+ ADD VARIABLE]                             │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│                            [CANCEL]  [DEPLOY]      │
└─────────────────────────────────────────────────────┘
```

### 3. Add Variable Dialog
```
┌─────────────────────────────────────────────────────┐
│ Add Environment Variable                            │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Name:   [DB_HOST                              ]    │
│                                                     │
│ Value:  [localhost                            ]    │
│                                                     │
│                                    [CANCEL] [ADD]   │
└─────────────────────────────────────────────────────┘
```

---

## Quick Links

### Your Service
https://console.cloud.google.com/run/detail/us-central1/research-system?project=trans-campus-480505-i2

### Secret Manager
https://console.cloud.google.com/security/secret-manager?project=trans-campus-480505-i2

### Cloud Run Services
https://console.cloud.google.com/run?project=trans-campus-480505-i2

---

## Tips & Best Practices

### ✅ Do's

1. **Use Secrets for Sensitive Data**
   - API keys → Use Secrets
   - Passwords → Use Secrets
   - Tokens → Use Secrets

2. **Use Environment Variables for Configuration**
   - Database names
   - Port numbers
   - Feature flags
   - Organization details

3. **Use Descriptive Names**
   - ✅ `DATABASE_HOST`
   - ❌ `DB_H`

4. **Document Your Variables**
   - Keep a list in your `.env.example` file
   - Add comments explaining each variable

### ❌ Don'ts

1. **Don't Store Secrets as Environment Variables**
   - ❌ `API_KEY=sk-1234567890` (visible in logs)
   - ✅ Use Secret Manager instead

2. **Don't Use Special Characters in Names**
   - ❌ `MY-VAR` (use underscore)
   - ✅ `MY_VAR`

3. **Don't Forget to Deploy**
   - Changes only take effect after clicking DEPLOY

---

## Troubleshooting

### Changes Not Taking Effect

**Problem:** Updated variable but app still uses old value

**Solution:**
1. Make sure you clicked **DEPLOY** button
2. Wait 2-5 minutes for deployment
3. Check logs: https://console.cloud.google.com/run/detail/us-central1/research-system/logs?project=trans-campus-480505-i2

### Can't Find Variable Section

**Problem:** Don't see "Variables & Secrets" section

**Solution:**
1. Make sure you clicked **EDIT & DEPLOY NEW REVISION**
2. Scroll down - it's below "Container" section
3. Try refreshing the page

### Secret Not Available

**Problem:** Secret doesn't appear in dropdown

**Solution:**
1. Go to Secret Manager
2. Create the secret first
3. Grant access to Cloud Run service account:
   ```
   serviceAccount:864580156744-compute@developer.gserviceaccount.com
   ```

### Deployment Failed

**Problem:** Error when clicking DEPLOY

**Solution:**
1. Check error message at top of page
2. Common issues:
   - Invalid variable name (use only letters, numbers, underscore)
   - Secret permission denied (grant access in Secret Manager)
   - Invalid container image

---

## Video Tutorial

**Watch:** How to Update Environment Variables in Cloud Run
https://www.youtube.com/results?search_query=google+cloud+run+environment+variables

---

## Need Help?

### Option 1: Use Command Line Instead
```bash
gcloud run services update research-system --region us-central1 --update-env-vars="VAR_NAME=value"
```

### Option 2: Use Interactive Script
```powershell
.\update-env.ps1
```

### Option 3: Contact Support
- Google Cloud Support: https://cloud.google.com/support
- Documentation: https://cloud.google.com/run/docs/configuring/environment-variables

---

## Example: Complete Setup

Let's add all common variables:

1. **Open:** https://console.cloud.google.com/run/detail/us-central1/research-system?project=trans-campus-480505-i2

2. **Click:** EDIT & DEPLOY NEW REVISION

3. **Scroll to:** Variables & Secrets

4. **Add these variables:**

   | Name | Value |
   |------|-------|
   | `DB_HOST` | `localhost` |
   | `DB_NAME` | `research_system` |
   | `DB_USER` | `postgres` |
   | `PORT` | `8080` |
   | `LOG_LEVEL` | `info` |
   | `ORGANIZATION_NAME` | `Research Initiative` |
   | `CONTACT_EMAIL` | `research@org.com` |
   | `USSD_CODE` | `*384*34153#` |
   | `GEMINI_MODEL` | `gemini-1.5-flash` |

5. **Click:** DEPLOY

6. **Wait:** 2-5 minutes

7. **Test:** https://research-system-864580156744.us-central1.run.app/health

---

**✅ Done! Your environment variables are updated!**
