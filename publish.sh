#!/bin/bash

# ============================================
# AgentLink - Prepare and Publish
# ============================================
# This script prepares and publishes to npm and GitHub

set -e  # Exit on error

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "╔═══════════════════════════════════════════╗"
echo "║  AgentLink - Prepare & Publish           ║"
echo "╚═══════════════════════════════════════════╝"
echo ""

# Step 1: Verify npm login
echo -e "${YELLOW}[1/7] Checking npm login...${NC}"
if ! npm whoami > /dev/null 2>&1; then
    echo -e "${RED}Error: Not logged in to npm${NC}"
    echo "Run: npm login"
    exit 1
fi
echo -e "${GREEN}✓ Logged in as $(npm whoami)${NC}"
echo ""

# Step 2: Run tests
echo -e "${YELLOW}[2/7] Running tests...${NC}"
npm test
echo -e "${GREEN}✓ All tests passed${NC}"
echo ""

# Step 3: Build
echo -e "${YELLOW}[3/7] Building project...${NC}"
npm run build
echo -e "${GREEN}✓ Build completed${NC}"
echo ""

# Step 4: Verify build
echo -e "${YELLOW}[4/7] Verifying build...${NC}"
if [ ! -f "dist/index.js" ]; then
    echo -e "${RED}Error: dist/index.js not found${NC}"
    exit 1
fi
if [ ! -f "dist/index.d.ts" ]; then
    echo -e "${RED}Error: dist/index.d.ts not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Build verified${NC}"
echo ""

# Step 5: Dry run
echo -e "${YELLOW}[5/7] Running npm publish --dry-run...${NC}"
npm publish --dry-run
echo -e "${GREEN}✓ Dry run completed${NC}"
echo ""

# Step 6: Confirm
echo -e "${YELLOW}[6/7] Ready to publish @dolutech/agent-link${NC}"
read -p "Publish now? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ]; then
    echo -e "${YELLOW}Publish cancelled${NC}"
    exit 0
fi
echo ""

# Step 7: Publish
echo -e "${YELLOW}[7/7] Publishing to npm...${NC}"
npm publish --access public
echo -e "${GREEN}✓ Published successfully!${NC}"
echo ""

# Create git tag
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${YELLOW}Creating git tag v$CURRENT_VERSION...${NC}"
git tag "v$CURRENT_VERSION" || echo "Tag already exists"
echo -e "${GREEN}✓ Tag created${NC}"
echo ""

echo "╔═══════════════════════════════════════════╗"
echo "║          Publish Complete! 🎉            ║"
echo "╚═══════════════════════════════════════════╝"
echo ""
echo "Package published:"
echo "  https://www.npmjs.com/package/@dolutech/agent-link"
echo ""
echo "Next steps:"
echo "  1. git push origin main"
echo "  2. git push origin v$CURRENT_VERSION"
echo "  3. Create release on GitHub"
echo ""
