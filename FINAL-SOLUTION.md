# FINAL SOLUTION - Reset Admin Password

## The Situation
- ✅ Backend is running on Google Cloud Run
- ✅ Database exists and is accessible
- ❌ Admin user exists but password doesn't match "Admin@123"
- ❌ Direct database connection from local machine requires Cloud SQL Proxy

## ✅ EASIEST SOLUTION - Copy/Paste in Cloud Shell

### Open Cloud Shell:
https://console.cloud.google.com/cloudshell?project=trans-campus-480505-i2

### Copy and paste this ENTIRE block:

```bash
gcloud sql connect research-db --user=postgres --database=research_system
```

When prompted for password, enter your postgres password.

Then run these SQL commands:

```sql
UPDATE users 
SET password_hash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILSBHxQYK',
    role = 'admin',
    is_active = true,
    updated_at = CURRENT_TIMESTAMP
WHERE username = 'admin' OR email = 'admin@research.com';

SELECT username, email, role, is_active FROM users WHERE username = 'admin';

\q
```

---

## Alternative: If You Don't Know Postgres Password

### Option 1: Reset Postgres Password First

In Cloud Shell:
```bash
gcloud sql users set-password postgres \
  --instance=research-db \
  --password=YOUR_NEW_PASSWORD
```

Then use that password to connect.

### Option 2: Create New Database User

```bash
# Create a new user with a password you know
gcloud sql users create admin_user \
  --instance=research-db \
  --password=YOUR_PASSWORD

# Grant permissions
gcloud sql connect research-db --user=postgres
# Then in psql:
GRANT ALL PRIVILEGES ON DATABASE research_system TO admin_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin_user;
\q

# Now connect with new user
gcloud sql connect research-db --user=admin_user --database=research_system
```

---

## After Running the Fix

### Test Login (Run on your local machine):

```bash
node research-assistence-back/verify-admin.js
```

Or:

```powershell
$body = '{"username":"admin","password":"Admin@123"}'
Invoke-RestMethod -Uri "https://research-system-864580156744.us-central1.run.app/auth/login" `
  -Method Post `
  -Body $body `
  -ContentType "application/json"
```

---

## Expected Success Response:

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "username": "admin",
    "email": "admin@research.com",
    "role": "admin",
    "is_active": true
  }
}
```

---

## Login Credentials (After Fix):
- **Username:** admin
- **Password:** Admin@123
- **Email:** admin@research.com

---

## Why I Can't Do This For You:

1. **No Access to Your Google Cloud Account** - I can't authenticate to your GCP
2. **No Database Password** - I don't have your postgres password
3. **Security** - Direct database access requires your credentials
4. **Cloud SQL Proxy** - Local connections need proxy setup with your credentials

---

## What I've Created For You:

1. ✅ `verify-admin.js` - Test login after fix
2. ✅ `fix-admin-direct.js` - Direct database connection script
3. ✅ `fix-admin-password.sql` - SQL file to run
4. ✅ `CLOUD-SHELL-FIX.md` - Detailed Cloud Shell instructions
5. ✅ `RUN-THIS-NOW.txt` - Quick reference
6. ✅ All necessary documentation

---

## Next Steps:

1. **Open Cloud Shell** (link above)
2. **Run the gcloud sql connect command**
3. **Enter your postgres password**
4. **Paste the SQL commands**
5. **Run verify-admin.js to test**
6. **You're done!**

---

## Need the Postgres Password?

Check these locations:
1. Your `.env` file: `DB_PASSWORD=`
2. Google Cloud Secret Manager
3. Your deployment configuration
4. Your notes from initial setup

Or reset it using the command in Option 1 above.

---

**This is the only way to fix it. I cannot access your database directly.**
**Please run the commands in Cloud Shell and let me know when done!**
