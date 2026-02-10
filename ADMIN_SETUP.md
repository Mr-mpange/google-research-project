# Admin User Setup Guide

This guide explains how to create and manage admin users for the Research Data Collection System.

## Quick Start

### Option 1: Automatic Creation (via Database Seed)

The easiest way to create a default admin user is to run the database seed script:

```bash
npm run db:seed
```

This will create a default admin user with:
- **Username:** `admin`
- **Password:** `Admin@123`
- **Email:** `admin@research.com`
- **Role:** `admin`

⚠️ **Important:** Change the password immediately after first login!

### Option 2: Interactive Creation (Custom Credentials)

For custom admin credentials, use the interactive script:

```bash
npm run create-admin
```

This will prompt you for:
1. Username (default: admin)
2. Email (default: admin@research.com)
3. Full Name (default: System Administrator)
4. Password (default: Admin@123)

Example session:
```
=== Create Admin User ===

Enter username (default: admin): myadmin
Enter email (default: admin@research.com): admin@mycompany.com
Enter full name (default: System Administrator): John Doe
Enter password (default: Admin@123): MySecurePass123!

Creating admin user...

✅ Admin user created successfully!
   ID: 123e4567-e89b-12d3-a456-426614174000
   Username: myadmin
   Email: admin@mycompany.com
   Full Name: John Doe
   Role: admin
   Created: 2024-01-15T10:30:00.000Z

📝 Login credentials:
   Username: myadmin
   Password: MySecurePass123!

⚠️  Please change the password after first login!
```

### Option 3: Direct Database Insert

If you prefer SQL, you can create an admin user directly:

```sql
-- First, hash your password using bcrypt (12 rounds)
-- You can use an online bcrypt generator or Node.js

-- Then insert the user
INSERT INTO users (username, email, password_hash, full_name, role, is_active)
VALUES (
  'admin',
  'admin@research.com',
  '$2a$12$YOUR_HASHED_PASSWORD_HERE',
  'System Administrator',
  'admin',
  true
);
```

## User Roles

The system supports three roles:

| Role | Permissions |
|------|-------------|
| **admin** | Full system access - manage users, questions, campaigns, view all data, send SMS |
| **researcher** | Create/edit questions, view responses, generate reports, send SMS |
| **viewer** | Read-only access to data and reports |

## Managing Admin Users

### Update Existing User to Admin

If you already have a user and want to make them an admin:

```bash
npm run create-admin
```

When prompted, enter the existing username or email. The script will ask if you want to update the user to admin role.

Or via SQL:
```sql
UPDATE users 
SET role = 'admin', 
    is_active = true,
    updated_at = CURRENT_TIMESTAMP
WHERE username = 'existing_user';
```

### List All Admin Users

```sql
SELECT id, username, email, full_name, is_active, created_at
FROM users
WHERE role = 'admin'
ORDER BY created_at DESC;
```

### Deactivate Admin User

```sql
UPDATE users 
SET is_active = false,
    updated_at = CURRENT_TIMESTAMP
WHERE username = 'admin_username';
```

### Reset Admin Password

```bash
npm run create-admin
```

Enter the existing admin username, then choose to update when prompted. Provide the new password.

## Login to the System

### Via API

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Admin@123"
  }'
```

Response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "username": "admin",
    "email": "admin@research.com",
    "full_name": "System Administrator",
    "role": "admin",
    "is_active": true,
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### Via Web Interface

1. Navigate to the frontend application
2. Click "Login" or go to `/auth`
3. Enter credentials:
   - Username: `admin`
   - Password: `Admin@123`
4. Click "Sign In"

## Security Best Practices

1. **Change Default Password**
   - Always change the default password immediately after first login
   - Use a strong password with at least 12 characters
   - Include uppercase, lowercase, numbers, and special characters

2. **Secure Password Storage**
   - Passwords are hashed using bcrypt with 12 salt rounds
   - Never store plain text passwords
   - Never share passwords via insecure channels

3. **JWT Token Management**
   - Tokens expire after 24 hours by default
   - Store tokens securely (httpOnly cookies or secure storage)
   - Implement token refresh mechanism

4. **Account Security**
   - Regularly audit admin users
   - Deactivate unused accounts
   - Monitor login attempts
   - Enable two-factor authentication (future feature)

5. **Access Control**
   - Follow principle of least privilege
   - Only grant admin role when necessary
   - Use researcher or viewer roles for limited access

## Troubleshooting

### "User already exists" Error

If you get this error when creating an admin:
1. The script will ask if you want to update the existing user
2. Choose "yes" to update to admin role and reset password
3. Or use a different username/email

### "Database connection failed" Error

Ensure:
1. PostgreSQL is running
2. Database exists: `createdb research_system`
3. Environment variables are set correctly in `.env`
4. Database migrations have been run: `npm run db:migrate`

### "bcryptjs not found" Error

Install dependencies:
```bash
npm install
```

### Cannot Login After Creation

Check:
1. Username and password are correct (case-sensitive)
2. User is active: `SELECT is_active FROM users WHERE username = 'admin';`
3. JWT_SECRET is set in `.env`
4. Backend server is running

## Environment Variables

Required for admin user creation:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=research_system
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your_secure_random_string
JWT_EXPIRES_IN=24h

# Bcrypt Configuration (optional)
BCRYPT_ROUNDS=12
```

## Support

For issues or questions:
- Check the logs: `tail -f logs/error.log`
- Review the [Backend README](README.md)
- Check the [API Documentation](docs/API.md)

---

**Last Updated:** 2024-01-15
