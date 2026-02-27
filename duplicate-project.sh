#!/bin/bash

# Bash script to duplicate the project
# Usage: ./duplicate-project.sh <new-project-name>

if [ -z "$1" ]; then
    echo "❌ Error: Please provide a new project name"
    echo "Usage: ./duplicate-project.sh <new-project-name>"
    exit 1
fi

NEW_PROJECT_NAME=$1
PARENT_DIR=".."
SOURCE_DIR="."

echo "🚀 Duplicating project to: $NEW_PROJECT_NAME"

# Get the current directory
CURRENT_DIR=$(pwd)
TARGET_DIR="$PARENT_DIR/$NEW_PROJECT_NAME"

# Check if target directory already exists
if [ -d "$TARGET_DIR" ]; then
    echo "❌ Error: Directory $TARGET_DIR already exists!"
    echo "Please choose a different name or delete the existing directory."
    exit 1
fi

# Copy the project (excluding node_modules, .next, .git, etc.)
echo "📁 Copying project files..."
rsync -av --progress \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '.git' \
    --exclude '*.log' \
    --exclude '.env.local' \
    --exclude '.env' \
    --exclude '.DS_Store' \
    "$SOURCE_DIR/" "$TARGET_DIR/"

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to copy project files"
    exit 1
fi

echo "✅ Project copied successfully!"

# Navigate to new project
cd "$TARGET_DIR"

# Update package.json
echo "📝 Updating package.json..."
if command -v jq &> /dev/null; then
    # Use jq if available (more reliable)
    jq ".name = \"$NEW_PROJECT_NAME\" | .description = \"New project based on MVP-IQ\"" package.json > package.json.tmp && mv package.json.tmp package.json
else
    # Fallback to sed (works on most systems)
    sed -i.bak "s/\"name\": \"football-feedback-app\"/\"name\": \"$NEW_PROJECT_NAME\"/" package.json
    sed -i.bak "s/\"description\": \".*\"/\"description\": \"New project based on MVP-IQ\"/" package.json
    rm -f package.json.bak
fi

# Remove old git remote if exists
if [ -d ".git" ]; then
    echo "🔧 Removing old git remote..."
    git remote remove origin 2>/dev/null
    echo "✅ Git remote removed. Add your new remote with: git remote add origin <your-repo-url>"
fi

# Create .env.local template
echo "📝 Creating .env.local template..."
cat > .env.local << 'EOF'
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=your-webhook-secret

# Resend
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=your-email@yourdomain.com

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF

echo ""
echo "✅ Project duplication complete!"
echo ""
echo "📋 Next steps:"
echo "  1. cd $NEW_PROJECT_NAME"
echo "  2. Update .env.local with your credentials"
echo "  3. Create a new Supabase project and run migrations"
echo "  4. npm install"
echo "  5. npm run dev"
echo ""
echo "📖 See DUPLICATE_PROJECT.md for detailed setup instructions"

cd "$CURRENT_DIR"
