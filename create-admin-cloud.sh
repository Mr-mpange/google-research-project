#!/bin/bash

# Create Admin User for Google Cloud Deployment
# Run this script in Google Cloud Shell or locally with Cloud SQL Proxy

echo "=== Create Admin User for Cloud Database ==="
echo ""

# Check if we're using Cloud SQL Proxy or direct connection
read -p "Are you using Cloud SQL Proxy? (yes/no, default: no): " USE_PROXY
USE_PROXY=${USE_PROXY:-no}

if [ "$USE_PROXY" = "yes" ]; then
    DB_HOST="127.0.0.1"
    DB_PORT="5432"
else
    # For Cloud SQL socket connection
    read -p "Enter Cloud SQL connection name (e.g., project:region:instance): " SQL_CONNECTION
    DB_HOST="/cloudsql/$SQL_CONNECTION"
    DB_PORT="5432"
fi

read -p "Enter database name (default: research_system): " DB_NAME
DB_NAME=${DB_NAME:-research_system}

read -p "Enter database user (default: postgres): " DB_USER
DB_USER=${DB_USER:-postgres}

read -sp "Enter database password: " DB_PASSWORD
echo ""

read -p "Enter admin username (default: admin): " ADMIN_USER
ADMIN_USER=${ADMIN_USER:-admin}

read -p "Enter admin email (default: admin@research.com): " ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@research.com}

read -p "Enter admin full name (default: System Administrator): " ADMIN_NAME
ADMIN_NAME=${ADMIN_NAME:-System Administrator}

read -sp "Enter admin password (default: Admin@123): " ADMIN_PASSWORD
ADMIN_PASSWORD=${ADMIN_PASSWORD:-Admin@123}
echo ""

echo ""
echo "Creating admin user..."

# Create SQL script
cat > /tmp/create_admin.sql << EOF
-- Check if admin user already exists
DO \$\$
DECLARE
    user_exists INTEGER;
    hashed_password TEXT;
BEGIN
    SELECT COUNT(*) INTO user_exists 
    FROM users 
    WHERE username = '$ADMIN_USER' OR email = '$ADMIN_EMAIL';
    
    IF user_exists > 0 THEN
        RAISE NOTICE 'User already exists. Updating to admin role...';
        
        -- Update existing user
        UPDATE users 
        SET role = 'admin', 
            is_active = true,
            updated_at = CURRENT_TIMESTAMP
        WHERE username = '$ADMIN_USER' OR email = '$ADMIN_EMAIL';
        
        RAISE NOTICE 'User updated to admin successfully!';
    ELSE
        -- Create new admin user
        -- Note: Password hash for "Admin@123" (bcrypt, 12 rounds)
        INSERT INTO users (
            username, 
            email, 
            password_hash, 
            full_name, 
            role, 
            is_active,
            created_at,
            updated_at
        ) VALUES (
            '$ADMIN_USER',
            '$ADMIN_EMAIL',
            '\$2a\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILSBHxQYK',
            '$ADMIN_NAME',
            'admin',
            true,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        );
        
        RAISE NOTICE 'Admin user created successfully!';
    END IF;
END \$\$;

-- Display the created/updated user
SELECT 
    id,
    username,
    email,
    full_name,
    role,
    is_active,
    created_at
FROM users 
WHERE username = '$ADMIN_USER' OR email = '$ADMIN_EMAIL';
EOF

# Execute SQL script
if [ "$USE_PROXY" = "yes" ]; then
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f /tmp/create_admin.sql
else
    # For Cloud SQL socket connection
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f /tmp/create_admin.sql
fi

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Admin user created/updated successfully!"
    echo ""
    echo "📝 Login credentials:"
    echo "   Username: $ADMIN_USER"
    echo "   Password: $ADMIN_PASSWORD"
    echo "   Email: $ADMIN_EMAIL"
    echo ""
    echo "⚠️  Please change the password after first login!"
else
    echo ""
    echo "❌ Failed to create admin user"
    echo "Check your database connection and credentials"
fi

# Clean up
rm /tmp/create_admin.sql
