# Testing Approval System - Step by Step

## Step 1: Run SQL Migration

You need to run the SQL migration on Cloud SQL. Here are the options:

### Option A: Using Cloud Console (Easiest)
1. Go to https://console.cloud.google.com/sql/instances/research-db/overview?project=trans-campus-480505-i2
2. Click "Cloud SQL Studio" or "Connect using Cloud Shell"
3. Copy and paste the contents of `src/database/add-approval-system.sql`
4. Execute the SQL

### Option B: Using gcloud with password
```bash
gcloud sql connect research-db --user=postgres --database=research_system
# Enter password when prompted
# Then paste the SQL from src/database/add-approval-system.sql
```

### Option C: Using Cloud Shell
```bash
# Upload the SQL file to Cloud Shell
# Then run:
gcloud sql connect research-db --user=postgres --database=research_system < add-approval-system.sql
```

---

## Step 2: Deploy Backend to Cloud Run

Once SQL migration is complete, deploy the backend:

```bash
cd research-assistence-back
gcloud run deploy research-system --source . --region=us-central1 --allow-unauthenticated --project=trans-campus-480505-i2
```

---

## Step 3: Test All New Functions

### 3.1 Test New Researcher Registration (Should be Pending)

```bash
curl -X POST https://research-system-864580156744.us-central1.run.app/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newresearcher",
    "email": "newresearcher@test.com",
    "password": "Test@123",
    "full_name": "New Researcher",
    "role": "researcher"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Registration successful! Your account is pending admin approval...",
  "user": {
    "id": "...",
    "username": "newresearcher",
    "status": "pending",
    ...
  },
  "requiresApproval": true
}
```

---

### 3.2 Test Login with Pending Account (Should Fail)

```bash
curl -X POST https://research-system-864580156744.us-central1.run.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newresearcher",
    "password": "Test@123"
  }'
```

**Expected Response:**
```json
{
  "error": "Account pending approval",
  "message": "Your account is waiting for admin approval. You will be notified once approved."
}
```

---

### 3.3 Login as Admin

```bash
curl -X POST https://research-system-864580156744.us-central1.run.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "adminuser",
    "password": "Admin@123"
  }'
```

**Save the token from response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {...}
}
```

---

### 3.4 Get Pending Users (As Admin)

```bash
curl https://research-system-864580156744.us-central1.run.app/api/users/pending/list \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": "...",
      "username": "newresearcher",
      "email": "newresearcher@test.com",
      "full_name": "New Researcher",
      "role": "researcher",
      "status": "pending",
      "created_at": "..."
    }
  ],
  "count": 1
}
```

---

### 3.5 Approve the User (As Admin)

```bash
curl -X POST https://research-system-864580156744.us-central1.run.app/api/users/USER_ID_HERE/approve \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User approved successfully",
  "user": {
    "id": "...",
    "username": "newresearcher",
    "status": "active",
    ...
  }
}
```

---

### 3.6 Test Login Again (Should Work Now)

```bash
curl -X POST https://research-system-864580156744.us-central1.run.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newresearcher",
    "password": "Test@123"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "username": "newresearcher",
    "status": "active",
    ...
  }
}
```

---

### 3.7 Test Reject User (Optional)

Register another test user, then reject them:

```bash
curl -X POST https://research-system-864580156744.us-central1.run.app/api/users/USER_ID_HERE/reject \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Does not meet requirements"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User rejected",
  "user": {
    "id": "...",
    "username": "...",
    "status": "rejected",
    ...
  }
}
```

---

### 3.8 Test Get All Users (Should Show Status)

```bash
curl https://research-system-864580156744.us-central1.run.app/api/users \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": "...",
      "username": "adminuser",
      "status": "active",
      "role": "admin",
      ...
    },
    {
      "id": "...",
      "username": "newresearcher",
      "status": "active",
      "role": "researcher",
      ...
    }
  ]
}
```

---

## ✅ Success Criteria

All tests should pass:
- ✅ New researchers register with status='pending'
- ✅ Pending users cannot login
- ✅ Admin can see pending users
- ✅ Admin can approve users
- ✅ Approved users can login
- ✅ Admin can reject users
- ✅ Rejected users cannot login
- ✅ All users show status field

---

## 🐛 Troubleshooting

### If SQL migration fails:
- Check if columns already exist
- The script uses `IF NOT EXISTS` so it's safe to run multiple times

### If deployment fails:
- Check Cloud Run logs: `gcloud run services logs read research-system --region=us-central1`
- Verify environment variables are set

### If tests fail:
- Check backend logs
- Verify database migration completed
- Check JWT token is valid

---

## 📝 Notes

- Save the admin token for testing
- Save the new user ID for approval/rejection tests
- All existing users will be set to 'active' status automatically
- Admin users are auto-approved on registration

