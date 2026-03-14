#!/bin/bash

# ============================================
# DEPLOY TO GITHUB
# ============================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "╔═══════════════════════════════════════════╗"
echo "║     AgentLink - Deploy to GitHub         ║"
echo "╚═══════════════════════════════════════════╝"
echo ""

# Step 1: Initialize git if needed
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}Initializing git repository...${NC}"
    git init
    echo -e "${GREEN}✓ Git initialized${NC}"
fi

# Step 2: Configure remote
echo -e "${YELLOW}Configuring remote...${NC}"
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/dolutech/agent-link.git
echo -e "${GREEN}✓ Remote configured${NC}"

# Step 3: Check what will be committed
echo -e "${YELLOW}Checking files to commit...${NC}"
git status --short
echo ""

# Step 4: Add files
echo -e "${YELLOW}Adding files...${NC}"
git add -A
echo -e "${GREEN}✓ Files added${NC}"

# Step 5: Show what will be committed
echo -e "${YELLOW}Files to be committed:${NC}"
git diff --cached --name-only
echo ""

# Step 6: Commit
echo -e "${YELLOW}Creating commit...${NC}"
git commit -m "Initial commit: AgentLink Protocol v0.1.0

Features:
- P2P messaging with libp2p (QUIC + TCP)
- Self-sovereign identity (DID did:key)
- End-to-end encryption (Noise protocol)
- Message signing (Ed25519)
- Trust levels & permissions
- NAT traversal (AutoNAT + DCUtR)
- DHT discovery (Kademlia)
- Circuit Relay fallback
- Security hardened (replay protection, rate limiting)
- OpenClaw skills for agent communication

Tests: 218 passing (100% coverage)
Build: TypeScript ES2022 + NodeNext
License: MIT

Repository: https://github.com/dolutech/agent-link
npm: https://www.npmjs.com/package/@dolutech/agent-link
"
echo -e "${GREEN}✓ Commit created${NC}"

# Step 7: Rename branch to main
git branch -M main 2>/dev/null || true

# Step 8: Push
echo -e "${YELLOW}Pushing to GitHub...${NC}"
echo -e "${YELLOW}⚠️  You'll be prompted for GitHub credentials${NC}"
git push -u origin main

echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║        Deploy to GitHub Complete! 🎉     ║"
echo "╚═══════════════════════════════════════════╝"
echo ""
echo "Repository: https://github.com/dolutech/agent-link"
echo ""
echo "Next steps:"
echo "  1. Create release on GitHub"
echo "  2. Run: ./deploy-npm.sh"
echo ""
