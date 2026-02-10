#!/bin/bash

# Create Admin User via Google Cloud SQL
# Run this in Google Cloud Shell

echo "=== Create Admin User via Google Cloud SQL ==="
echo ""

# Get project and instance info
read -p "Enter your Google Cloud Project ID: " PROJECT_ID
read -p "Enter Cloud SQL instance name (default: research-db): " INSTANCE_NAME
INSTANCE_NAME=${INSTANCE_NAME:-research-db}

read -p "Enter database name (default: research_system): " DB_NAME
DB_NAME=${DB_NAME:-research_system}

read -p "Enter database user (default: postgres): " DB_USER
DB_USER=${DB_USER:-postgres}

read -p "Enter admin username (default: admin): " ADMIN_USER
ADMIN_USER=${ADMIN_USER:-admin}

read -p "Enter admin email (default: admin@research.com): " ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@research.com}

read -p "Enter admin full name (default: System Administrator): " ADMIN_NAME
ADMIN_NAME=${ADMIN_NAME:-"System Administrator"}

echo ""
echo "Creating admin user in Cloud SQL..."

# Create SQL command
SQL_COMMAND="
DO \$\$
DECLARE
    user_exists INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_exists 
    FROM users 
    WHERE username = '$ADMIN_USER' OR email = '$ADMIN_EMAIL';
    
    IF user_exists > 0 THEN
        RAISE NOTICE 'User already exists. Updating to admin role...';
        UPDATE users 
        SET role = 'admin', 
            is_active = true,
            updated_at = CURRENT_TIMESTAMP
        WHERE username = '$ADMIN_USER' OR email = '$ADMIN_EMAIL';
        RAISE NOTICE 'User updated successfully!';
    ELSE
        INSERT INTO users (
            username, 
            email, 
            password_hash, 
            full_name, 
            role, 
            is_active
        ) VALUES (
            '$ADMIN_USER',
            '$ADMIN_EMAIL',
            '\$2a\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILSBHxQYK',
            '$ADMIN_NAME',
            'admin',
            true
        );
        RAISE NOTICE 'Admin user created successfully!';
    END IF;
END \$\$;

SELECT username, email, role, is_active FROM users WHERE username = '$ADMIN_USER';
"

# Execute via gcloud
gcloud sql connect $INSTANCE_NAME \
    --user=$DB_USER \
    --database=$DB_NAME \
    --project=$PROJECT_ID \
    --quiet << EOF
$SQL_COMMAND
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Admin user created/updated successfully!"
    echo ""
    echo "📝 Login credentials:"
    echo "   Username: $ADMIN_USER"
    echo "   Password: Admin@123"
    echo "   Email: $ADMIN_EMAIL"
    echo ""
    echo "⚠️  Please change the password after first login!"
    echo ""
    echo "🌐 Test login at:"
    echo "   https://research-system-864580156744.us-central1.run.app/api/auth/login"
else
    echo ""
    echo "❌ Failed to create admin user"
    echo "Make sure you have the correct permissions and the instance is running"
fi
