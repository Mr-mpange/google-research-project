# Create Admin User on Google Cloud

Since you're using Google Cloud, here are the easiest ways to create an admin user.

## ✅ Method 1: Direct gcloud Command (Easiest)

Run this single command in **Google Cloud Shell** or your terminal (with gcloud CLI installed):

```bash
gcloud sql connect research-db --user=postgres --database=research_system << 'EOF'
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin') THEN
        INSERT INTO users (username, email, password_hash, full_name, role, is_active)
        VALUES (
            'admin',
            'admin@research.com',
            '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILSBHxQYK',
            'System Administrator',
            'admin',
            true
        );
        RAISE NOTICE 'Admin user created!';
    ELSE
        UPDATE users SET role = 'admin', is_active = true WHERE username = 'admin';
        RAISE NOTICE 'Admin user updated!';
    END IF;
END $$;

SELECT username, email, role FROM users WHERE username = 'admin';
EOF
```

**Default Credentials:**
- Username: `admin`
- Password: `Admin@123`
- Email: `admin@research.com`

---

## 🔧 Method 2: Using Cloud Shell Script

1. **Open Google Cloud Shell** (click the terminal icon in Google Cloud Console)

2. **Clone your repo** (if not already):
```bash
git clone https://github.com/Mr-mpange/google-research-project.git
cd google-research-project/research-assistence-back
```

3. **Make script executable**:
```bash
chmod +x create-admin-gcloud.sh
```

4. **Run the script**:
```bash
./create-admin-gcloud.sh
```

5. **Follow the prompts** or use defaults

---

## 🗄️ Method 3: Via Cloud SQL Console

1. Go to **Cloud SQL** in Google Cloud Console
2. Click on your instance (`research-db`)
3. Click **"OPEN CLOUD SHELL"** button
4. Run this SQL:

```sql
INSERT INTO users (username, email, password_hash, full_name, role, is_active)
VALUES (
    'admin',
    'admin@research.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILSBHxQYK',
    'System Administrator',
    'admin',
    true
)
ON CONFLICT (username) DO UPDATE 
SET role = 'admin', is_active = true;
```

---

## 🚀 Method 4: Via Cloud Run Job

Create a one-time job to seed the database:

```bash
# Create a Cloud Run job
gcloud run jobs create seed-admin \
  --image gcr.io/YOUR_PROJECT_ID/research-system \
  --region us-central1 \
  --add-cloudsql-instances YOUR_PROJECT_ID:us-central1:research-db \
  --set-env-vars="DB_HOST=/cloudsql/YOUR_PROJECT_ID:us-central1:research-db,DB_NAME=research_system" \
  --command="npm" \
  --args="run,db:seed"

# Execute the job
gcloud run jobs execute seed-admin --region us-central1
```

This will run the seed script which creates the admin user automatically.

---

## 📱 Method 5: Via API (If Backend is Running)

If your backend is already deployed and running:

```bash
curl -X POST https://research-system-864580156744.us-central1.run.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@research.com",
    "password": "Admin@123",
    "full_name": "System Administrator",
    "role": "admin"
  }'
```

**Note:** This only works if registration endpoint allows admin role creation.

---

## ✅ Verify Admin User Created

Test the login:

```bash
curl -X POST https://research-system-864580156744.us-central1.run.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Admin@123"
  }'
```

Expected response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "username": "admin",
    "email": "admin@research.com",
    "role": "admin"
  }
}
```

---

## 🔐 Default Credentials

After creation, use these credentials to login:

| Field | Value |
|-------|-------|
| **Username** | `admin` |
| **Password** | `Admin@123` |
| **Email** | `admin@research.com` |
| **Role** | `admin` |

⚠️ **IMPORTANT:** Change the password immediately after first login!

---

## 🆘 Troubleshooting

### "relation 'users' does not exist"
Run migrations first:
```bash
gcloud sql connect research-db --user=postgres --database=research_system
\i schema.sql
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

### "connection refused"
Make sure Cloud SQL instance is running:
```bash
gcloud sql instances describe research-db
```

---

## 📞 Quick Support

**Your Production URL:** https://research-system-864580156744.us-central1.run.app

**Test Health:**
```bash
curl https://research-system-864580156744.us-central1.run.app/health
```

---

**Need help?** Check the logs:
```bash
gcloud run services logs read research-system --region us-central1 --limit 50
```
