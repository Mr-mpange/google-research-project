# 🔧 Fix Admin Password - Quick Guide

## ✅ Test Results

**Backend Status:** ✅ Healthy and running  
**Admin User:** ❌ Exists but password is incorrect  
**Issue:** Password mismatch - needs reset

---

## 🚀 Quick Fix (Choose One Method)

### Method 1: Google Cloud Shell (Recommended)

1. **Open Google Cloud Shell** at https://console.cloud.google.com

2. **Run this single command:**
```bash
gcloud sql connect research-db --user=postgres --database=research_system << 'EOF'
UPDATE users 
SET password_hash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILSBHxQYK',
    role = 'admin',
    is_active = true
WHERE username = 'admin';
SELECT username, email, role, is_active FROM users WHERE username = 'admin';
EOF
```

3. **Done!** Password is now reset to `Admin@123`

---

### Method 2: Using SQL File

1. **Open Google Cloud Shell**

2. **Upload the SQL file:**
```bash
# If you have the file locally, upload it to Cloud Shell
# Or create it directly:
cat > fix-admin.sql << 'EOF'
UPDATE users 
SET password_hash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILSBHxQYK',
    role = 'admin',
    is_active = true
WHERE username = 'admin';
SELECT username, email, role FROM users WHERE username = 'admin';
EOF
```

3. **Execute it:**
```bash
gcloud sql connect research-db --user=postgres --database=research_system < fix-admin.sql
```

---

### Method 3: Interactive SQL

1. **Connect to database:**
```bash
gcloud sql connect research-db --user=postgres --database=research_system
```

2. **Run this SQL:**
```sql
UPDATE users 
SET password_hash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILSBHxQYK',
    role = 'admin',
    is_active = true
WHERE username = 'admin';
```

3. **Verify:**
```sql
SELECT username, email, role, is_active FROM users WHERE username = 'admin';
```

4. **Exit:**
```sql
\q
```

---

## ✅ Test the Fix

After running the fix, test the login:

### Via PowerShell (Windows):
```powershell
$body = '{"username":"admin","password":"Admin@123"}'
Invoke-RestMethod -Uri "https://research-system-864580156744.us-central1.run.app/auth/login" -Method Post -Body $body -ContentType "application/json"
```

### Via curl (Linux/Mac):
```bash
curl -X POST https://research-system-864580156744.us-central1.run.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123"}'
```

### Via Node.js:
```bash
node research-assistence-back/test-and-fix-admin.js
```

---

## 🎯 Expected Result

You should see:
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

## 🔐 Login Credentials

After the fix:
- **Username:** `admin`
- **Password:** `Admin@123`
- **Email:** `admin@research.com`
- **Role:** `admin`

---

## 🌐 Login URLs

**Backend API:**
```
https://research-system-864580156744.us-central1.run.app/auth/login
```

**Frontend (if deployed):**
```
https://your-frontend-url.com/auth
```

---

## ⚠️ Important

1. **Change the password** after first login!
2. The password hash is for `Admin@123` (bcrypt, 12 rounds)
3. Keep your credentials secure

---

## 🆘 Troubleshooting

### "permission denied"
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### "instance not found"
Check your instance name:
```bash
gcloud sql instances list
```

### "database does not exist"
Create it:
```bash
gcloud sql databases create research_system --instance=research-db
```

### Still not working?
Check the logs:
```bash
gcloud run services logs read research-system --region us-central1 --limit 50
```

---

## 📞 Quick Links

- **Backend:** https://research-system-864580156744.us-central1.run.app
- **Health Check:** https://research-system-864580156744.us-central1.run.app/health
- **Google Cloud Console:** https://console.cloud.google.com

---

**Last Updated:** 2026-02-10
