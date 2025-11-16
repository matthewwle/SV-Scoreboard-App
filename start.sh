#!/bin/bash

# Volleyball Scoreboard Quick Start Script

echo "🏐 Volleyball Scoreboard System - Quick Start"
echo "=============================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. You have: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo ""

# Check if .env files exist
if [ ! -f "backend/.env" ]; then
    echo "⚠️  Backend .env file not found."
    echo "   Creating from template..."
    cp backend/.env.example backend/.env
    echo "   ⚠️  IMPORTANT: Edit backend/.env with your Supabase credentials!"
    echo ""
fi

if [ ! -f "frontend/.env" ]; then
    echo "📝 Creating frontend .env from template..."
    cp frontend/.env.example frontend/.env
    echo "✅ Frontend .env created"
    echo ""
fi

# Check if node_modules exist
if [ ! -d "backend/node_modules" ] || [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing dependencies..."
    echo ""
    
    echo "Installing backend dependencies..."
    cd backend
    npm install
    cd ..
    
    echo ""
    echo "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    
    echo ""
    echo "✅ Dependencies installed"
    echo ""
fi

# Check database connection
echo "🔍 Checking configuration..."
if grep -q "your_supabase_url" backend/.env; then
    echo ""
    echo "⚠️  WARNING: You need to configure your database!"
    echo ""
    echo "Steps:"
    echo "1. Create a Supabase account at https://supabase.com"
    echo "2. Create a new project"
    echo "3. Run the SQL script from database/schema.sql"
    echo "4. Edit backend/.env with your credentials"
    echo ""
    read -p "Have you configured the database? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Please configure the database first, then run this script again."
        exit 1
    fi
fi

echo ""
echo "✅ Configuration looks good!"
echo ""
echo "🚀 Starting the application..."
echo ""
echo "   Backend will run on: http://localhost:3001"
echo "   Frontend will run on: http://localhost:5173"
echo ""
echo "   Control UI: http://localhost:5173/control"
echo "   Admin UI: http://localhost:5173/admin"
echo "   Overlay UI: http://localhost:5173/court/{courtId}"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""
echo "=============================================="
echo ""

# Start both servers using npm run dev from root
npm run dev

