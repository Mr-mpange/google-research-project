# User Management API Documentation

## Overview
Complete user management system for admins to register, verify, and manage researchers.

## Base URL
```
https://research-system-864580156744.us-central1.run.app/api/users
```

## Authentication
All endpoints require JWT authentication via Bearer token:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## Endpoints

### 1. Get All Users
**GET** `/api/users`

**Authorization:** Admin only

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": "uuid",
      "username": "researcher1",
      "email": "researcher1@example.com",
      "full_name": "John Researcher",
      "role": "researcher",
      "is_active": true,
      "created_at": "2026-02-10T08:00:00.000Z",
      "updated_at": "2026-02-10T08:00:00.000Z"
    }
  ]
}
```

---

### 2. Get Single User
**GET** `/api/users/:userId`

**Authorization:** Authenticated users

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "username": "researcher1",
    "email": "researcher1@example.com",
    "full_name": "John Researcher",
    "role": "researcher",
    "is_active": true,
    "created_at": "2026-02-10T08:00:00.000Z"
  }
}
```

---

### 3. Update User Status (Activate/Deactivate)
**PATCH** `/api/users/:userId/status`

**Authorization:** Admin only

**Request Body:**
```json
{
  "is_active": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "User deactivated successfully",
  "user": {
    "id": "uuid",
    "username": "researcher1",
    "is_active": false,
    "updated_at": "2026-02-10T09:00:00.000Z"
  }
}
```

---

### 4. Update User Role
**PATCH** `/api/users/:userId/role`

**Authorization:** Admin only

**Request Body:**
```json
{
  "role": "admin"
}
```

**Valid Roles:** `admin`, `researcher`, `viewer`

**Response:**
```json
{
  "success": true,
  "message": "User role updated to admin",
  "user": {
    "id": "uuid",
    "username": "researcher1",
    "role": "admin",
    "updated_at": "2026-02-10T09:00:00.000Z"
  }
}
```

---

### 5. Delete User
**DELETE** `/api/users/:userId`

**Authorization:** Admin only

**Note:** Cannot delete your own account

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

### 6. Update User Profile
**PATCH** `/api/users/:userId/profile`

**Authorization:** User themselves or Admin

**Request Body:**
```json
{
  "full_name": "John Updated Researcher",
  "email": "newemail@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": {
    "id": "uuid",
    "username": "researcher1",
    "email": "newemail@example.com",
    "full_name": "John Updated Researcher",
    "updated_at": "2026-02-10T09:00:00.000Z"
  }
}
```

---

### 7. Change Password
**POST** `/api/users/:userId/change-password`

**Authorization:** User themselves or Admin

**Request Body (for own password):**
```json
{
  "current_password": "OldPassword123",
  "new_password": "NewPassword123"
}
```

**Request Body (admin changing other user's password):**
```json
{
  "new_password": "NewPassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid role"
}
```

### 401 Unauthorized
```json
{
  "error": "Access denied. No token provided."
}
```

### 403 Forbidden
```json
{
  "error": "Access denied. Admin role required."
}
```

### 404 Not Found
```json
{
  "error": "User not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to fetch users"
}
```

---

## Usage Examples

### cURL Examples

**Get all users:**
```bash
curl -X GET https://research-system-864580156744.us-central1.run.app/api/users \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Deactivate user:**
```bash
curl -X PATCH https://research-system-864580156744.us-central1.run.app/api/users/USER_ID/status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_active": false}'
```

**Change user role:**
```bash
curl -X PATCH https://research-system-864580156744.us-central1.run.app/api/users/USER_ID/role \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "admin"}'
```

**Delete user:**
```bash
curl -X DELETE https://research-system-864580156744.us-central1.run.app/api/users/USER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Files Created

### Backend:
1. `src/controllers/usersController.js` - User management logic
2. `src/routes/users.js` - User management routes
3. `src/server.js` - Added users routes

### Frontend:
1. `src/pages/UserManagement.tsx` - User management UI (updated)

---

## Features Implemented

✅ List all users  
✅ View single user  
✅ Activate/Deactivate users  
✅ Change user roles  
✅ Delete users  
✅ Update user profiles  
✅ Change passwords  
✅ Admin-only protection  
✅ Logging and audit trail  
✅ Error handling  

---

## Security Features

- JWT authentication required
- Role-based authorization (admin only for management)
- Password hashing with bcrypt
- Cannot delete own account
- Audit logging for all actions
- Input validation
- SQL injection prevention

---

## Next Steps

To deploy these changes:

1. **Commit and push backend changes**
2. **Deploy to Google Cloud Run**
3. **Restart frontend dev server**
4. **Test user management features**

---

**Last Updated:** 2026-02-10
