#!/bin/bash

# Redis Setup Script for Research Assistance System

echo "========================================="
echo "Redis Setup for Research Assistance System"
echo "========================================="
echo ""

# Check if Redis is installed
if command -v redis-server &> /dev/null; then
    echo "✓ Redis is already installed"
    redis-server --version
else
    echo "✗ Redis is not installed"
    echo ""
    echo "Installing Redis..."
    
    # Detect OS and install Redis
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v apt-get &> /dev/null; then
            sudo apt-get update
            sudo apt-get install -y redis-server
        elif command -v yum &> /dev/null; then
            sudo yum install -y redis
        else
            echo "Please install Redis manually for your Linux distribution"
            exit 1
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install redis
        else
            echo "Please install Homebrew first: https://brew.sh"
            exit 1
        fi
    else
        echo "Unsupported OS. Please install Redis manually."
        exit 1
    fi
fi

echo ""
echo "========================================="
echo "Starting Redis Server"
echo "========================================="
echo ""

# Start Redis server
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    sudo systemctl start redis-server
    sudo systemctl enable redis-server
    echo "✓ Redis server started and enabled"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    brew services start redis
    echo "✓ Redis server started"
fi

echo ""
echo "========================================="
echo "Testing Redis Connection"
echo "========================================="
echo ""

# Test Redis connection
if redis-cli ping | grep -q "PONG"; then
    echo "✓ Redis is running and responding"
else
    echo "✗ Redis is not responding"
    exit 1
fi

echo ""
echo "========================================="
echo "Redis Configuration"
echo "========================================="
echo ""

echo "Add these to your .env file:"
echo ""
echo "REDIS_HOST=localhost"
echo "REDIS_PORT=6379"
echo "REDIS_PASSWORD="
echo "REDIS_TLS=false"
echo "REDIS_ENABLED=true"
echo ""

echo "========================================="
echo "Setup Complete!"
echo "========================================="
echo ""
echo "Redis is ready to use. Start your application with:"
echo "npm start"
echo ""
echo "To stop Redis:"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "sudo systemctl stop redis-server"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    echo "brew services stop redis"
fi
echo ""
