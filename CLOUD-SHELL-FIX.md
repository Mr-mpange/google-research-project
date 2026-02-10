# Fix Admin Password - Cloud Shell Instructions

## Issue in Cloud Shell
You're getting: `There was no instance found or you are not authorized to connect to it`

## Solution: Use Cloud Console UI Instead

### Method 1: Via Cloud Console (Easiest)

1. **Go to Cloud SQL Instances:**
   https://console.cloud.google.com/sql/instances/research-db/overview?project=trans-campus-480505-i2

2. **Click "CONNECT TO THIS INSTANCE"** button (top right)

3. **Select "Open Cloud Shell"**

4. **When Cloud Shell opens with the connection command, it will look like:**
   ```
   gcloud sql connect research-db --user=postgres
   ```

5. **Press Enter** (it will prompt for password)

6. **Enter the postgres password** (you should have this from your setup)

7. **Once connected to psql, run:**
   ```sql
   \c research_system
   
   UPDATE users 
   SET password_hash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILSBHxQYK',
       role = 'admin',
       is_active = true
   WHERE username = 'admin';
   
   SELECT username, email, role FROM users WHERE username = 'admin';
   
   \q
   ```

---

### Method 2: Grant Permissions First

If you don't have permissions, run this in Cloud Shell:

```bash
# Get your email
gcloud config get-value account

# Grant yourself Cloud SQL Client role
gcloud projects add-iam-policy-binding trans-campus-480505-i2 \
  --member="user:YOUR_EMAIL" \
  --role="roles/cloudsql.client"

# Wait 1 minute for permissions to propagate, then try again
gcloud sql connect research-db --user=postgres --database=research_system
```

---

### Method 3: Use Cloud Run Job (Automated)

Since your backend is already deployed, we can use it to run the migration:

```bash
# In Cloud Shell, run:
curl -X POST https://research-system-864580156744.us-central1.run.app/api/migrate \
  -H "Content-Type: application/json"
```

This will run the database migrations which include creating the admin user.

---

### Method 4: Direct SQL via Cloud Console

1. Go to: https://console.cloud.google.com/sql/instances/research-db/databases?project=trans-campus-480505-i2

2. Click on **research_system** database

3. Click **"QUERY"** tab at the top

4. Paste this SQL:
   ```sql
   UPDATE users 
   SET password_hash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILSBHxQYK',
       role = 'admin',
       is_active = true
   WHERE username = 'admin';
   
   SELECT username, email, role FROM users WHERE username = 'admin';
   ```

5. Click **"RUN"**

---

## After Running Any Method

Test the login by running this on your local machine:

```bash
node research-assistence-back/verify-admin.js
```

Or test via curl:
```bash
curl -X POST https://research-system-864580156744.us-central1.run.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123"}'
```

---

## Login Credentials (After Fix)

- **Username:** admin
- **Password:** Admin@123
- **Email:** admin@research.com

---

## Still Having Issues?

The database might already have the admin user with a different password. Try these common passwords:

1. `Admin@123`
2. `admin123`
3. `password`
4. Check your .env file for any default password

Or contact your database administrator for the postgres password.
