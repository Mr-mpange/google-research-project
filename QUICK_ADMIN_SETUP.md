# Quick Admin Setup - Troubleshooting

## Issue: Database Connection Failed

You're seeing this error:
```
password authentication failed for user "postgres"
```

## Solutions

### Option 1: Fix Database Connection (Recommended)

1. **Check if PostgreSQL is running:**
   ```bash
   # Windows
   Get-Service postgresql*
   
   # Or check if port 5432 is listening
   netstat -an | findstr 5432
   ```

2. **Update `.env` file with correct password:**
   ```bash
   # Edit research-assistence-back/.env
   DB_PASSWORD=your_actual_postgres_password
   ```

3. **Verify database exists:**
   ```bash
   # Connect to PostgreSQL
   psql -U postgres
   
   # List databases
   \l
   
   # If research_system doesn't exist, create it:
   CREATE DATABASE research_system;
   
   # Exit
   \q
   ```

4. **Run migrations first:**
   ```bash
   cd research-assistence-back
   npm run db:migrate
   ```

5. **Then create admin:**
   ```bash
   npm run create-admin
   ```

### Option 2: Use SQL Script Directly

If Node.js connection fails, use the SQL script:

```bash
# Connect to PostgreSQL
psql -U postgres -d research_system

# Run the SQL script
\i create-admin.sql

# Or in one command:
psql -U postgres -d research_system -f create-admin.sql
```

This creates an admin user with:
- **Username:** `admin`
- **Password:** `Admin@123`
- **Email:** `admin@research.com`

### Option 3: Manual SQL Insert

Connect to your database and run:

```sql
-- Use the pre-hashed password for "Admin@123"
INSERT INTO users (
    username, 
    email, 
    password_hash, 
    full_name, 
    role, 
    is_active
) VALUES (
    'admin',
    'admin@research.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILSBHxQYK',
    'System Administrator',
    'admin',
    true
);
```

### Option 4: Use Production Database

If you want to use the production database on Google Cloud:

1. Update `.env` to point to production database
2. Or use the seed script which already ran on production

## Verify Admin User Exists

```sql
SELECT username, email, role, is_active 
FROM users 
WHERE role = 'admin';
```

## Test Login

```bash
# Test via API
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123"}'
```

## Common Issues

### 1. "relation 'users' does not exist"
**Solution:** Run migrations first
```bash
npm run db:migrate
```

### 2. "database 'research_system' does not exist"
**Solution:** Create the database
```bash
createdb research_system
# Or in psql:
CREATE DATABASE research_system;
```

### 3. "password authentication failed"
**Solution:** Check your PostgreSQL password in `.env`

### 4. "ECONNREFUSED"
**Solution:** PostgreSQL is not running. Start it:
```bash
# Windows (as Administrator)
net start postgresql-x64-13

# Or start PostgreSQL service from Services app
```

## Need Help?

1. Check PostgreSQL is installed: `psql --version`
2. Check PostgreSQL is running: `Get-Service postgresql*`
3. Check database exists: `psql -U postgres -l`
4. Check `.env` file has correct credentials
5. Check logs: `type logs\error.log`

## Default Credentials

After successful creation:
- **Username:** `admin`
- **Password:** `Admin@123`
- **Email:** `admin@research.com`
- **Role:** `admin`

⚠️ **Change the password after first login!**
