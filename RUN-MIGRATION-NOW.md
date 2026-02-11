# 🚀 RUN SQL MIGRATION NOW

## ⚠️ IMPORTANT: Migration is NOT applied yet!

The approval system code is deployed, but the database schema changes are missing.

---

## 🎯 Quick Steps (Choose ONE method)

### Method 1: Cloud Console (EASIEST - Recommended)

1. **Open Cloud SQL Studio**
   - Go to: https://console.cloud.google.com/sql/instances/research-db/overview?project=trans-campus-480505-i2
   - Click the **"OPEN CLOUD SQL STUDIO"** button (top right)
   - Or click **"Connect"** → **"Open Cloud SQL Studio"**

2. **Execute the SQL**
   - Copy ALL the SQL from: `src/database/add-approval-system.sql`
   - Paste it into the SQL editor
   - Click **"Run"** or press Ctrl+Enter
   - Wait for "Query executed successfully"

3. **Verify**
   - Run this command in your terminal:
   ```bash
   node check-schema-via-api.js
   ```
   - Should show: ✅ DATABASE MIGRATION WAS APPLIED SUCCESSFULLY!

---

### Method 2: Cloud Shell

1. **Open Cloud Shell**
   - Go to: https://console.cloud.google.com/
   - Click the **Cloud Shell icon** (top right, looks like >_)

2. **Upload SQL file**
   - Click the **3 dots menu** → **Upload file**
   - Upload: `src/database/add-approval-system.sql`

3. **Connect and Execute**
   ```bash
   gcloud sql connect research-db --user=postgres --database=research_system
   # Enter password when prompted
   # Then paste the SQL or use: \i add-approval-system.sql
   ```

---

### Method 3: Local with Cloud SQL Proxy

1. **Download Cloud SQL Proxy**
   ```bash
   # Windows
   curl -o cloud-sql-proxy.exe https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.2/cloud-sql-proxy.x64.exe
   ```

2. **Start Proxy**
   ```bash
   cloud-sql-proxy.exe trans-campus-480505-i2:us-central1:research-db
   ```

3. **Run Migration**
   ```bash
   # In another terminal
   set DB_HOST=127.0.0.1
   set DB_PASSWORD=your_password
   node run-migration-direct.js
   ```

---

## 📋 What the Migration Does

The SQL will:
- ✅ Add `status` column to users (pending/active/inactive/rejected)
- ✅ Add `approval_date`, `approved_by`, `rejection_reason` columns
- ✅ Create `research_projects` table
- ✅ Add `project_id` to questions and responses
- ✅ Set all existing users to 'active' status
- ✅ Add indexes for performance

**Safe to run multiple times** - uses `IF NOT EXISTS` checks

---

## ✅ After Migration

Once migration is complete, run tests:

```bash
# Check if migration was applied
node check-schema-via-api.js

# Run full test suite
node test-approval-api.js
```

Expected results:
- ✅ New researchers register with status='pending'
- ✅ Pending users cannot login
- ✅ Admin can approve/reject users
- ✅ Approved users can login

---

## 🐛 Troubleshooting

### "Password authentication failed"
- You need the postgres password for the Cloud SQL instance
- Check your .env file or Cloud SQL settings

### "Permission denied"
- Make sure you're logged in: `gcloud auth login`
- Set project: `gcloud config set project trans-campus-480505-i2`

### "Table already exists"
- That's OK! The script uses `IF NOT EXISTS`
- It will skip existing tables/columns

---

## 📞 Need Help?

If you're stuck, just tell me which method you want to use and I'll guide you through it step by step!

---

**Current Status:** ❌ Migration NOT applied
**Next Step:** Choose a method above and run the SQL
**Time needed:** ~2 minutes

