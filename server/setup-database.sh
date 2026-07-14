#!/bin/bash

echo "🚀 ProjectPulse Database Setup Script"
echo "======================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with your database credentials."
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

echo "📊 Step 1: Testing database connection..."
echo ""

# Test database connection
npx prisma db execute --stdin <<< "SELECT 1;" 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Database connection successful!"
    echo ""
else
    echo "⚠️  Database connection failed."
    echo ""
    echo "Your Neon database might be paused. Please:"
    echo "1. Visit https://console.neon.tech"
    echo "2. Select your project"
    echo "3. Wait for database to wake up (green 'Active' status)"
    echo "4. Run this script again"
    echo ""
    exit 1
fi

echo "📦 Step 2: Generating Prisma Client..."
npx prisma generate

if [ $? -eq 0 ]; then
    echo "✅ Prisma Client generated!"
    echo ""
else
    echo "❌ Failed to generate Prisma Client"
    exit 1
fi

echo "🗄️  Step 3: Pushing database schema..."
npx prisma db push --skip-generate

if [ $? -eq 0 ]; then
    echo "✅ Database schema created successfully!"
    echo ""
else
    echo "❌ Failed to push database schema"
    exit 1
fi

echo "🎉 Database setup complete!"
echo ""
echo "Next steps:"
echo "1. Run 'npm run dev' to start the development server"
echo "2. Visit http://localhost:4000/api/health to test"
echo "3. Open Prisma Studio: 'npx prisma studio'"
echo ""
