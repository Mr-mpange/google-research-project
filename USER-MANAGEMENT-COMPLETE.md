# User Management System - Complete Documentation

## ✅ Status: FULLY FUNCTIONAL

The User Management system is now fully deployed and operational on Google Cloud Run.

## 🌐 Backend API

**Base URL:** `https://research-system-864580156744.us-central1.run.app`

### Available Endpoints

All user management endpoints require admin authentication.

#### 1. Get All Users
```
GET /api/users
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": "uuid",
      "username": "string",
      "email": "string",
      "full_name": "string",
      "role": "admin|researcher|viewer",
      "is_active": true,
      "created_at": "timestamp"
    }
  ]
}
```

#### 2. Get Single User
```
GET /api/users/:userId
Authorization: Bearer {token}
```

#### 3. Create User
```
POST /auth/register
Content-Type: application/json

{
  "username": "string",
  "email": "string",
  "password": "string",
  "full_name": "string",
  "role": "researcher|viewer|admin"
}
```

#### 4. Update User Role
```
PATCH /api/users/:userId/role
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "role": "admin|researcher|viewer"
}
```

#### 5. Update User Status
```
PATCH /api/users/:userId/status
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "is_active": true|false
}
```

#### 6. Delete User
```
DELETE /api/users/:userId
Authorization: Bearer {admin_token}
```

#### 7. Update User Profile
```
PATCH /api/users/:userId/profile
Authorization: Bearer {token}
Content-Type: application/json

{
  "full_name": "string",
  "email": "string"
}
```

#### 8. Change Password
```
POST /api/users/:userId/change-password
Authorization: Bearer {token}
Content-Type: application/json

{
  "current_password": "string",
  "new_password": "string"
}
```

## 🎨 Frontend Features

The User Management page (`/user-management`) provides:

### Statistics Dashboard
- Total Users count
- Active Researchers count
- Inactive Users count

### User Table
- View all users with details
- Sort and filter capabilities
- Real-time status updates

### User Actions
1. **Create User** - Register new users with role assignment
2. **Activate/Deactivate** - Toggle user account status
3. **Change Role** - Update user roles (admin, researcher, viewer)
4. **Delete User** - Remove user accounts (with confirmation)

### Role-Based Access
- **Admin**: Full access to all user management features
- **Researcher**: Cannot access user management
- **Viewer**: Cannot access user management

## 🔐 Admin Credentials

**Username:** `adminuser`  
**Password:** `Admin@123`  
**Email:** `adminuser@research.com`

## 🧪 Testing

Run the test script to verify all operations:

```bash
cd research-assistence-back
node test-user-management.js
```

This tests:
- ✅ Admin login
- ✅ Fetch all users
- ✅ Create new user
- ✅ Update user role
- ✅ Deactivate user
- ✅ Delete user

## 📊 Current Users

As of deployment, the system has 9 registered users:
- 2 admins (adminuser, admin)
- 7 researchers (Mr-mpange + 6 test users)

## 🚀 Deployment Info

- **Service:** research-system
- **Region:** us-central1
- **Latest Revision:** research-system-00064-q6v
- **Status:** ✅ Deployed and serving traffic
- **Redis:** ✅ Connected

## 🔄 Frontend Setup

To use the User Management page:

1. **Start the frontend dev server:**
   ```bash
   cd research-web-assistance
   npm run dev
   ```

2. **Access the application:**
   - Open browser to `http://localhost:5173`
   - Login with admin credentials
   - Navigate to "User Management" in the sidebar

3. **Refresh if needed:**
   - Hard refresh: `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac)
   - This ensures the latest API URL is loaded

## 📝 Notes

- All user management operations require admin role
- Passwords must be at least 6 characters
- Email addresses must be unique
- Usernames must be unique
- Deleted users cannot be recovered
- Inactive users cannot login but data is preserved

## 🔧 Troubleshooting

### 404 Error on /api/users
- **Solution:** Backend has been redeployed with latest changes
- **Verify:** Check that frontend is using correct API URL

### CORS Errors
- **Solution:** Backend allows all origins in development mode
- **Production:** Add your frontend URL to ALLOWED_ORIGINS env variable

### Authentication Errors
- **Solution:** Ensure you're logged in as admin
- **Check:** Token is being sent in Authorization header

## ✨ Next Steps

The User Management system is complete and ready for production use. You can now:

1. Register new researchers through the admin panel
2. Manage user roles and permissions
3. Activate/deactivate accounts as needed
4. Monitor user statistics

All features have been tested and verified working! 🎉
