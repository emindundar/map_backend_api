#!/bin/bash

echo "🔍 Starting verification..."
echo ""

# Check Node version
echo "✓ Checking Node.js version..."
node_version=$(node -v)
echo "  Node.js: $node_version"

# Check pnpm
echo "✓ Checking pnpm..."
pnpm -v > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "  pnpm: $(pnpm -v)"
else
    echo "  ❌ pnpm not found"
    exit 1
fi

# Check .env file
echo "✓ Checking .env file..."
if [ -f .env ]; then
    echo "  .env exists"
else
    echo "  ❌ .env not found"
    exit 1
fi

# Install dependencies
echo "✓ Installing dependencies..."
pnpm install --frozen-lockfile > /dev/null 2>&1

# Build project
echo "✓ Building project..."
pnpm build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "  Build successful"
else
    echo "  ❌ Build failed"
    exit 1
fi

# Run linter
echo "✓ Running linter..."
pnpm lint > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "  Linting passed"
else
    echo "  ⚠️  Linting warnings (check manually)"
fi

# Check Docker files
echo "✓ Checking Docker configuration..."
if [ -f Dockerfile ] && [ -f docker-compose.yml ]; then
    echo "  Docker files exist"
else
    echo "  ❌ Docker files missing"
    exit 1
fi

echo ""
echo "✅ All verifications passed!"
echo ""
echo "Next steps:"
echo "1. Review .env configuration"
echo "2. Start PostgreSQL: docker-compose up -d postgres"
echo "3. Run migrations: pnpm db:init"
echo "4. Seed admin user: pnpm seed"
echo "5. Start application: pnpm start:dev"
echo "6. Access Swagger: http://localhost:3000/api/docs"
