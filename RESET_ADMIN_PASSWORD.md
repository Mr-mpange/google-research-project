# Reset Admin Password on Google Cloud

## ✅ Good News!
The admin user **already exists** in your database!

## ❌ Problem
The password doesn't match "Admin@123"

## 🔧 Solution: Reset the Password

### Method 1: Via Google Cloud Shell (Easiest)

1. **Open Google Cloud Shell** (click terminal icon in Google Cloud Console)

2. **Connect to your Cloud SQL database:**
```bash
gcloud sql connect research-db --user=postgres --database=research_system
```

3. **Run this SQL to reset the password:**
```sql
UPDATE users 
SET password_hash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILSBHxQYK',
    role = 'admin',
    is_active = true,
    updated_at = CURRENT_TIMESTAMP
WHERE username = 'admin' OR email = 'admin@research.com';

-- Verify the update
SELECT username, email, role, is_active FROM users WHERE username = 'admin';
```

4. **Exit psql:**
```sql
\q
```

5. **Test login:**
```bash
curl -X POST https://research-system-864580156744.us-central1.run.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123"}'
```

---

### Method 2: One-Line Command

Run this in Google Cloud Shell:

```bash
gcloud sql connect research-db --user=postgres --database=research_system << 'EOF'
UPDATE users 
SET password_hash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILSBHxQYK',
    role = 'admin',
    is_active = true
WHERE username = 'admin';

SELECT username, email, role FROM users WHERE username = 'admin';
EOF
```

---

### Method 3: Via Cloud Console UI

1. Go to **Cloud SQL** in Google Cloud Console
2. Click on your instance (`research-db`)
3. Click **"DATABASES"** tab
4. Click on `research_system` database
5. Click **"OPEN CLOUD SHELL"**
6. Run the UPDATE SQL from Method 1

---

## 🔐 After Reset

**New Credentials:**
- Username: `admin`
- Password: `Admin@123`
- Email: `admin@research.com`

## ✅ Test the Login

### Via curl:
```bash
curl -X POST https://research-system-864580156744.us-central1.run.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123"}'
```

### Via PowerShell (Windows):
```powershell
$body = '{"username":"admin","password":"Admin@123"}'
Invoke-RestMethod -Uri "https://research-system-864580156744.us-central1.run.app/auth/login" `
  -Method Post `
  -Body $body `
  -ContentType "application/json"
```

### Expected Response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "username": "admin",
    "email": "admin@research.com",
    "full_name": "System Administrator",
    "role": "admin",
    "is_active": true
  }
}
```

---

## 🔍 Check Current Admin User

To see what's currently in the database:

```sql
SELECT 
    username, 
    email, 
    full_name,
    role, 
    is_active,
    created_at
FROM users 
WHERE username = 'admin' OR email = 'admin@research.com';
```

---

## 🆘 Troubleshooting

### "relation 'users' does not exist"
The database hasn't been migrated. Run:
```bash
# Via Cloud Run job or locally with Cloud SQL Proxy
npm run db:migrate
```

### "permission denied"
Make sure you're authenticated:
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### "instance not found"
Check your instance name:
```bash
gcloud sql instances list
```

### Still can't login?
Check the logs:
```bash
gcloud run services logs read research-system --region us-central1 --limit 50
```

---

## 📝 Password Hash Reference

The password hash `$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILSBHxQYK` is for:
- **Password:** `Admin@123`
- **Algorithm:** bcrypt
- **Rounds:** 12

If you want a different password, you can generate a new hash using:

```javascript
const bcrypt = require('bcryptjs');
const password = 'YourNewPassword';
const hash = bcrypt.hashSync(password, 12);
console.log(hash);
```

Then use that hash in the UPDATE statement.

---

## ⚠️ Security Note

After successfully logging in, **change the password immediately** to something more secure!

---

**Your Production URL:** https://research-system-864580156744.us-central1.run.app
