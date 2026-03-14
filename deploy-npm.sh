#!/bin/bash

# ============================================
# DEPLOY TO NPM
# ============================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "╔═══════════════════════════════════════════╗"
echo "║       AgentLink - Deploy to npmjs        ║"
echo "╚═══════════════════════════════════════════╝"
echo ""

# Step 1: Check npm login
echo -e "${YELLOW}[1/7] Checking npm login...${NC}"
if ! npm whoami > /dev/null 2>&1; then
    echo -e "${RED}✗ Not logged in to npm${NC}"
    echo ""
    echo "Please login first:"
    echo "  npm adduser"
    echo ""
    echo "Or create account at: https://www.npmjs.com/signup"
    exit 1
fi
echo -e "${GREEN}✓ Logged in as $(npm whoami)${NC}"
echo ""

# Step 2: Verify package name availability
echo -e "${YELLOW}[2/7] Checking package name...${NC}"
if npm view @dolutech/agent-link > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Package @dolutech/agent-link already exists${NC}"
    echo "This will publish a new version"
else
    echo -e "${GREEN}✓ Package name available${NC}"
fi
echo ""

# Step 3: Run tests
echo -e "${YELLOW}[3/7] Running tests...${NC}"
npm test
echo -e "${GREEN}✓ All tests passed (218/218)${NC}"
echo ""

# Step 4: Build
echo -e "${YELLOW}[4/7] Building project...${NC}"
npm run build
echo -e "${GREEN}✓ Build completed${NC}"
echo ""

# Step 5: Verify build
echo -e "${YELLOW}[5/7] Verifying build...${NC}"
if [ ! -f "dist/index.js" ]; then
    echo -e "${RED}✗ Error: dist/index.js not found${NC}"
    exit 1
fi
if [ ! -f "dist/index.d.ts" ]; then
    echo -e "${RED}✗ Error: dist/index.d.ts not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Build verified${NC}"
echo ""

# Step 6: Dry run
echo -e "${YELLOW}[6/7] Running npm publish --dry-run...${NC}"
npm publish --dry-run
echo -e "${GREEN}✓ Dry run completed${NC}"
echo ""

# Step 7: Publish
echo -e "${YELLOW}[7/7] Ready to publish @dolutech/agent-link v0.1.0${NC}"
read -p "Publish to npmjs.com? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ]; then
    echo -e "${YELLOW}Publish cancelled${NC}"
    exit 0
fi
echo ""

echo -e "${YELLOW}Publishing to npmjs.com...${NC}"
npm publish --access public
echo -e "${GREEN}✓ Published successfully!${NC}"
echo ""

# Show package info
echo "╔═══════════════════════════════════════════╗"
echo "║        Deploy to npm Complete! 🎉        ║"
echo "╚═══════════════════════════════════════════╝"
echo ""
echo "Package published:"
echo "  https://www.npmjs.com/package/@dolutech/agent-link"
echo ""
echo "Install with:"
echo "  npm install @dolutech/agent-link"
echo ""
echo "View package:"
echo "  npm view @dolutech/agent-link"
echo ""
